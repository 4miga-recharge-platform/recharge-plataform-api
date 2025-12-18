import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, RechargeStatus } from '@prisma/client';
import { BigoService } from '../bigo/bigo.service';
import { EmailService } from '../email/email.service';
import { getOrderCompletedTemplate } from '../email/templates/order-completed.template';
import { MetricsService } from '../metrics/metrics.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../env';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookStatus } from './dto/webhook-payment.dto';
import { BraviveHttpService } from './http/bravive-http.service';

@Injectable()
export class BraviveService {
  private readonly logger = new Logger(BraviveService.name);
  private readonly BIGO_DIAMONDS_PER_USD_AVERAGE = 62.5;

  constructor(
    private readonly httpService: BraviveHttpService,
    private readonly prisma: PrismaService,
    private readonly bigoService: BigoService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly metricsService: MetricsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creates a new payment in Bravive
   */
  async createPayment(
    dto: CreatePaymentDto,
    token: string,
  ): Promise<PaymentResponseDto> {
    try {
      const response = await this.httpService.post<PaymentResponseDto>(
        '/payments',
        dto,
        token,
      );

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
   * Checks payment status from Bravive and updates if changed
   * Used for manual payment verification
   */
  async checkAndUpdatePaymentStatus(
    bravivePaymentId: string,
    token: string,
  ): Promise<{ status: string; updated: boolean }> {
    try {
      // Fetch current status from Bravive
      const bravivePayment = await this.getPayment(bravivePaymentId, token);

      // Map Bravive status to our internal status
      const braviveStatus = bravivePayment.status?.toUpperCase();
      let internalStatus: PaymentStatus | null = null;

      if (braviveStatus === 'APPROVED') {
        internalStatus = PaymentStatus.PAYMENT_APPROVED;
      } else if (braviveStatus === 'REJECTED' || braviveStatus === 'CANCELED') {
        internalStatus = PaymentStatus.PAYMENT_REJECTED;
      } else if (braviveStatus === 'PENDING') {
        internalStatus = PaymentStatus.PAYMENT_PENDING;
      }

      // Find payment in our database
      const payment = await this.prisma.payment.findFirst({
        where: {
          braviveId: bravivePaymentId,
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
        this.logger.warn({
          message: 'Payment not found for manual check',
          bravivePaymentId,
        });
        return {
          status: bravivePayment.status || 'UNKNOWN',
          updated: false,
        };
      }

      // Check if status changed
      const currentStatus = payment.status;
      const statusChanged = internalStatus && currentStatus !== internalStatus;

      if (!statusChanged) {
        this.logger.log({
          message: 'Payment status unchanged',
          bravivePaymentId,
          currentStatus,
          braviveStatus,
        });
        return {
          status: bravivePayment.status || 'UNKNOWN',
          updated: false,
        };
      }

      // Status changed - process the update
      this.logger.log({
        message: 'Payment status changed, processing update',
        bravivePaymentId,
        oldStatus: currentStatus,
        newStatus: internalStatus,
        braviveStatus,
      });

      const order = payment.order;
      const recharge = order.orderItem?.recharge;

      // Process based on new status
      if (internalStatus === PaymentStatus.PAYMENT_APPROVED) {
        await this.handleApprovedPayment(
          payment.id,
          order.id,
          recharge?.id,
          order.orderNumber,
          Number(order.price),
          recharge?.amountCredits,
          recharge?.userIdForRecharge,
        );
      } else if (internalStatus === PaymentStatus.PAYMENT_REJECTED) {
        // Map Bravive status to WebhookStatus enum
        let webhookStatus: WebhookStatus;
        if (braviveStatus === 'REJECTED') {
          webhookStatus = WebhookStatus.REJECTED;
        } else if (braviveStatus === 'CANCELED') {
          webhookStatus = WebhookStatus.CANCELED;
        } else {
          webhookStatus = WebhookStatus.REJECTED; // Default to REJECTED
        }

        await this.handleRejectedOrCanceledPayment(
          payment.id,
          order.id,
          webhookStatus,
        );
      }

      return {
        status: bravivePayment.status || 'UNKNOWN',
        updated: true,
      };
    } catch (error) {
      this.logger.error({
        message: 'Error checking payment status',
        bravivePaymentId,
        error: error.message,
        stack: error.stack,
      });
      throw new BadRequestException(
        `Failed to check payment status: ${error.message}`,
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
  async handleWebhook(webhookDto: any): Promise<void> {
    this.logger.log({
      message: 'Webhook received',
      braviveId: webhookDto?.id,
      status: webhookDto?.status,
      type: webhookDto?.type,
    });

    const braviveId = webhookDto?.id;
    if (!braviveId) {
      this.logger.warn({
        message: 'Webhook without id',
        payload: webhookDto,
      });
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        braviveId: braviveId,
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
      this.logger.warn({
        message: 'Payment not found',
        braviveId,
      });
      return;
    }

    const webhookStatus = webhookDto?.status?.toUpperCase();
    if (!webhookStatus) {
      this.logger.warn({
        message: 'Webhook without status',
        braviveId,
      });
      return;
    }

    const targetPaymentStatus = this.mapWebhookStatusToPaymentStatus(
      webhookStatus,
    );

    if (targetPaymentStatus && payment.status === targetPaymentStatus) {
      this.logger.log({
        message: 'Payment already in target status (idempotency)',
        braviveId,
        currentStatus: payment.status,
        webhookStatus,
      });
      return;
    }

    const order = payment.order;
    const recharge = order.orderItem?.recharge;

    switch (webhookStatus) {
      case WebhookStatus.APPROVED:
        await this.handleApprovedPayment(
          payment.id,
          order.id,
          recharge?.id,
          order.orderNumber,
          Number(order.price),
          recharge?.amountCredits,
          recharge?.userIdForRecharge,
        );
        break;

      case WebhookStatus.REJECTED:
      case WebhookStatus.CANCELED:
        await this.handleRejectedOrCanceledPayment(
          payment.id,
          order.id,
          webhookStatus as WebhookStatus,
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
        this.logger.warn({
          message: 'Unhandled webhook status',
          status: webhookStatus,
          braviveId,
        });
    }
  }

  /**
   * Maps webhook status to internal payment status
   */
  private mapWebhookStatusToPaymentStatus(
    webhookStatus: string,
  ): PaymentStatus | null {
    switch (webhookStatus) {
      case WebhookStatus.APPROVED:
        return PaymentStatus.PAYMENT_APPROVED;
      case WebhookStatus.REJECTED:
      case WebhookStatus.CANCELED:
        return PaymentStatus.PAYMENT_REJECTED;
      case WebhookStatus.REFUNDED:
      case WebhookStatus.CHARGEBACK:
        return PaymentStatus.PAYMENT_REJECTED;
      default:
        return null;
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
          qrCode: null,
          qrCodetextCopyPaste: null,
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
            statusUpdatedAt: new Date(),
          },
        });
      }
    });

    // Trigger Bigo recharge if all required data is available
    if (rechargeId && amountCredits && bigoId) {
      try {
        const valueInUSD = amountCredits / this.BIGO_DIAMONDS_PER_USD_AVERAGE;
        const calculatedValueInBRL = valueInUSD * env.BIGO_USD_TO_BRL_RATE;
        const roundedValue = Math.round(calculatedValueInBRL * 100) / 100;

        const bigoRechargeDto = {
          recharge_bigoid: bigoId,
          bu_orderid: orderNumber,
          value: amountCredits,
          total_cost: roundedValue,
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
              statusUpdatedAt: new Date(),
            },
          });
        });

        this.logger.log(`Bigo recharge completed for order ${orderNumber}`);

        // Send completion email to user
        try {
          // Fetch complete order data for email
          const completedOrder = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
              orderItem: {
                include: {
                  package: {
                    select: {
                      name: true,
                    },
                  },
                  recharge: {
                    select: {
                      amountCredits: true,
                    },
                  },
                },
              },
              store: {
                select: {
                  domain: true,
                },
              },
            },
          });

          if (completedOrder?.user?.email && completedOrder.orderItem) {
            const html = getOrderCompletedTemplate(
              completedOrder.user.name,
              completedOrder.orderNumber,
              completedOrder.orderItem.rechargeId,
              completedOrder.orderItem.package.name,
              completedOrder.orderItem.recharge.amountCredits,
              Number(completedOrder.price),
              new Date(),
              completedOrder.store?.domain || undefined,
            );

            await this.emailService.sendEmail(
              completedOrder.user.email,
              `Pedido ${completedOrder.orderNumber} - Concluído com Sucesso! ✅`,
              html,
            );

            this.logger.log(`Completion email sent for order ${orderNumber}`);
          }
        } catch (emailError) {
          this.logger.error(
            `Failed to send completion email for order ${orderNumber}: ${emailError.message}`,
          );
          // Don't throw - order is already completed, email failure shouldn't affect order status
        }

        // Confirm coupon usage (this also updates influencer metrics if coupon exists)
        try {
          await this.orderService.confirmCouponUsage(orderId);
          this.logger.log(`Coupon usage confirmed for order ${orderNumber}`);
        } catch (metricsError) {
          this.logger.error(
            `Failed to confirm coupon usage for order ${orderNumber}: ${metricsError.message}`,
          );
          // Don't throw - order is already completed
        }

        // Update store metrics for the order (updates daily and monthly metrics)
        try {
          await this.metricsService.updateMetricsForOrder(orderId);
          this.logger.log(`Metrics updated for order ${orderNumber}`);
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
            statusUpdatedAt: new Date(),
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

      // Revert coupon and influencer metrics if order had coupon
      await this.orderService.revertCouponUsage(orderId, tx);
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
              statusUpdatedAt: new Date(),
            },
          });
        }
      }

      await this.orderService.revertCouponUsage(orderId, tx);
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

    this.logger.warn(
      `Payment dispute registered for order ${orderId} - Awaiting resolution`,
    );
  }
}
