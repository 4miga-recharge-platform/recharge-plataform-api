import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, RechargeStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BigoService } from '../bigo/bigo.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookPaymentDto, WebhookStatus } from './dto/webhook-payment.dto';
import { BraviveHttpService } from './http/bravive-http.service';

@Injectable()
export class BraviveService {
  private readonly logger = new Logger(BraviveService.name);

  constructor(
    private readonly httpService: BraviveHttpService,
    private readonly prisma: PrismaService,
    private readonly bigoService: BigoService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  /**
   * Creates a new payment in Bravive
   */
  async createPayment(
    dto: CreatePaymentDto,
    token: string,
  ): Promise<PaymentResponseDto> {
    this.logger.log(
      `Creating payment: ${dto.description} - Amount: ${dto.amount}`,
    );

    try {
      const response = await this.httpService.post<PaymentResponseDto>(
        '/payments',
        dto,
        token,
      );

      this.logger.log(`Payment created successfully: ${response.id}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw new BadRequestException(
        `Failed to create payment in Bravive: ${error.message}`,
      );
    }
  }

  /**
   * Fetches a payment by ID from Bravive
   */
  async getPayment(id: string, token: string): Promise<PaymentResponseDto> {
    this.logger.log(`Fetching payment: ${id}`);

    try {
      const response = await this.httpService.get<PaymentResponseDto>(
        `/payments/${id}`,
        token,
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch payment: ${error.message}`);
      throw new BadRequestException(
        `Failed to fetch payment from Bravive: ${error.message}`,
      );
    }
  }

  /**
   * Lists payments (optional, for admin)
   */
  async listPayments(
    token: string,
    params?: {
      limit?: number;
      page?: number;
      method?: string;
      status?: string;
    },
  ): Promise<any> {
    this.logger.log('Listing payments');

    try {
      const response = await this.httpService.get<any>(
        '/payments',
        token,
        params,
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to list payments: ${error.message}`);
      throw new BadRequestException(
        `Failed to list payments from Bravive: ${error.message}`,
      );
    }
  }

  /**
   * Processes payment webhook from Bravive
   */
  async handleWebhook(webhookDto: WebhookPaymentDto): Promise<void> {
    this.logger.log(
      `Processing webhook for payment ${webhookDto.id} - Status: ${webhookDto.status}`,
    );

    try {
      // Find payment by externalId (Bravive payment ID)
      const payment = await this.prisma.payment.findFirst({
        where: {
          externalId: webhookDto.id,
          paymentProvider: 'bravive',
        },
        include: {
          order: {
            include: {
              orderItem: {
                include: {
                  recharge: true,
                  package: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  documentValue: true,
                },
              },
            },
          },
        },
      });

      if (!payment || !payment.order) {
        this.logger.warn(`Payment not found for externalId: ${webhookDto.id}`);
        return;
      }

      const order = payment.order;
      const recharge = order.orderItem?.recharge;

      // Process based on status
      switch (webhookDto.status) {
        case WebhookStatus.APPROVED:
          await this.handleApprovedPayment(
            payment.id,
            order.id,
            recharge?.id,
            order.orderNumber,
            Number(order.price), // Convert Decimal to number
            recharge?.amountCredits,
            recharge?.userIdForRecharge, // bigoId is the userIdForRecharge
          );
          break;

        case WebhookStatus.REJECTED:
        case WebhookStatus.CANCELED:
          await this.handleRejectedOrCanceledPayment(
            payment.id,
            order.id,
            webhookDto.status,
          );
          break;

        case WebhookStatus.REFUNDED:
          await this.handleRefundedPayment(payment.id, order.id);
          break;

        case WebhookStatus.CHARGEBACK:
          await this.handleChargebackPayment(
            payment.id,
            order.id,
            recharge?.id,
          );
          break;

        case WebhookStatus.IN_DISPUTE:
          await this.handleDisputedPayment(payment.id, order.id);
          break;

        default:
          this.logger.warn(
            `Unhandled webhook status: ${webhookDto.status} for payment ${webhookDto.id}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook for payment ${webhookDto.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handles approved payment: updates status and triggers Bigo recharge
   */
  private async handleApprovedPayment(
    paymentId: string,
    orderId: string,
    rechargeId: string | undefined,
    orderNumber: string,
    orderPrice: string | number,
    amountCredits: number | undefined,
    bigoId: string | undefined,
  ): Promise<void> {
    this.logger.log(`Processing approved payment for order ${orderNumber}`);

    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAYMENT_APPROVED,
          statusUpdatedAt: new Date(),
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.PROCESSING,
        },
      });

      // Update recharge status if exists
      if (rechargeId) {
        await tx.recharge.update({
          where: { id: rechargeId },
          data: {
            status: RechargeStatus.RECHARGE_PENDING,
          },
        });
      }
    });

    // Trigger Bigo recharge if all required data is available
    if (rechargeId && amountCredits && bigoId) {
      try {
        // Generate unique seqid (13-32 chars, lowercase letters, numbers, underscore)
        const seqid = this.generateSeqId();

        // Prepare Bigo recharge DTO
        const bigoRechargeDto = {
          recharge_bigoid: bigoId,
          seqid: seqid,
          bu_orderid: orderNumber, // Use orderNumber as business order ID
          value: amountCredits,
          total_cost: Number(orderPrice),
          currency: 'BRL',
        };

        this.logger.log(`Triggering Bigo recharge for order ${orderNumber}`);

        // Call Bigo recharge
        await this.bigoService.diamondRecharge(bigoRechargeDto);

        // Update order and recharge status to COMPLETED/APPROVED after successful Bigo recharge
        await this.prisma.$transaction(async (tx) => {
          // Update order status to COMPLETED (both payment and recharge are done)
          await tx.order.update({
            where: { id: orderId },
            data: {
              orderStatus: OrderStatus.COMPLETED,
            },
          });

          // Update recharge status to approved
          await tx.recharge.update({
            where: { id: rechargeId },
            data: {
              status: RechargeStatus.RECHARGE_APPROVED,
            },
          });
        });

        this.logger.log(`Bigo recharge completed for order ${orderNumber}`);

        // Confirm coupon usage and update sales metrics (only when order is COMPLETED)
        try {
          await this.orderService.confirmCouponUsage(orderId);
          this.logger.log(
            `Coupon usage confirmed and sales metrics updated for order ${orderNumber}`,
          );
        } catch (metricsError) {
          this.logger.error(
            `Failed to update metrics for order ${orderNumber}: ${metricsError.message}`,
          );
          // Don't throw - order is already completed
        }
      } catch (bigoError) {
        this.logger.error(
          `Failed to trigger Bigo recharge for order ${orderNumber}: ${bigoError.message}`,
        );
        // Don't throw - payment is already approved, recharge can be retried
        // Order remains in PROCESSING status until recharge succeeds
      }
    }
  }

  /**
   * Handles rejected or canceled payment
   */
  private async handleRejectedOrCanceledPayment(
    paymentId: string,
    orderId: string,
    status: WebhookStatus,
  ): Promise<void> {
    this.logger.log(`Processing ${status} payment for order ${orderId}`);

    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status:
            status === WebhookStatus.REJECTED
              ? PaymentStatus.PAYMENT_REJECTED
              : PaymentStatus.PAYMENT_REJECTED, // CANCELED also maps to REJECTED
          statusUpdatedAt: new Date(),
        },
      });

      // Update order status to EXPIRED
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.EXPIRED,
        },
      });

      // Update recharge status if exists
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });

      if (order?.orderItem?.recharge) {
        await tx.recharge.update({
          where: { id: order.orderItem.recharge.id },
          data: {
            status: RechargeStatus.RECHARGE_REJECTED,
          },
        });
      }
    });
  }

  /**
   * Handles refunded payment
   */
  private async handleRefundedPayment(
    paymentId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log(`Processing refunded payment for order ${orderId}`);

    await this.prisma.$transaction(async (tx) => {
      // Update payment status (keep as APPROVED but mark as refunded in order)
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.REFOUNDED,
        },
      });
    });
  }

  private async handleChargebackPayment(
    paymentId: string,
    orderId: string,
    rechargeId: string | undefined,
  ): Promise<void> {
    this.logger.log(`Processing chargeback payment for order ${orderId}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAYMENT_REJECTED,
          statusUpdatedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.REFOUNDED,
        },
      });

      if (rechargeId) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            orderItem: {
              include: {
                recharge: true,
              },
            },
          },
        });

        if (order?.orderItem?.recharge) {
          await tx.recharge.update({
            where: { id: order.orderItem.recharge.id },
            data: {
              status: RechargeStatus.RECHARGE_REJECTED,
            },
          });
        }
      }
    });

    this.logger.warn(`Chargeback processed for order ${orderId}`);
  }

  private async handleDisputedPayment(
    paymentId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log(`Processing disputed payment for order ${orderId}`);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });

      if (payment?.status === PaymentStatus.PAYMENT_APPROVED) {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            statusUpdatedAt: new Date(),
          },
        });
      }
    });

    this.logger.warn(`Payment dispute registered for order ${orderId} - Awaiting resolution`);
  }

  /**
   * Generates a unique seqid for Bigo recharge (13-32 chars, lowercase, numbers, underscore)
   */
  private generateSeqId(): string {
    const timestamp = Date.now().toString(36); // Base36 timestamp
    const random = Math.random().toString(36).substring(2, 9); // Random part
    const uuid = randomUUID().replace(/-/g, '').substring(0, 8); // UUID part without dashes

    // Combine and ensure length between 13-32
    let seqid = `${timestamp}_${random}_${uuid}`.toLowerCase();

    // Ensure it's within valid length
    if (seqid.length > 32) {
      seqid = seqid.substring(0, 32);
    } else if (seqid.length < 13) {
      seqid = seqid.padEnd(13, '0');
    }

    return seqid;
  }
}
