import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RechargeStatus,
} from '@prisma/client';
import { randomInt } from 'crypto';
import { validateRequiredFields } from 'src/utils/validation.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string, userId: string, page = 1, limit = 6) {
    try {
      // Check if the user belongs to the store
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          storeId,
        },
      });

      if (!user) {
        throw new ForbiddenException('User does not belong to this store');
      }

      const [data, totalOrders] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            storeId: user.storeId,
            userId,
          },
          include: {
            payment: true,
            orderItem: {
              include: {
                recharge: true,
                package: true,
              },
            },
            couponUsages: {
              include: {
                coupon: {
                  select: {
                    id: true,
                    title: true,
                    discountPercentage: true,
                    discountAmount: true,
                    isFirstPurchase: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.order.count({
          where: {
            storeId: user.storeId,
            userId,
          },
        }),
      ]);

      const totalPages = Math.ceil(totalOrders / limit);

      return {
        data,
        totalOrders,
        page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async findAllByStore(storeId: string, page = 1, limit = 6) {
    try {
      const [data, totalOrders] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            storeId,
          },
          include: {
            payment: true,
            orderItem: {
              include: {
                recharge: true,
                package: true,
              },
            },
            couponUsages: {
              include: {
                coupon: {
                  select: {
                    id: true,
                    title: true,
                    discountPercentage: true,
                    discountAmount: true,
                    isFirstPurchase: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.order.count({
          where: {
            storeId,
          },
        }),
      ]);

      const totalPages = Math.ceil(totalOrders / limit);

      return {
        data,
        totalOrders,
        page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          userId, // Ensures user only sees their own orders
        },
        include: {
          payment: true,
          orderItem: {
            include: {
              recharge: true,
              package: true,
            },
          },
          couponUsages: {
            include: {
              coupon: {
                select: {
                  id: true,
                  title: true,
                  discountPercentage: true,
                  discountAmount: true,
                  isFirstPurchase: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return order;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async create(createOrderDto: CreateOrderDto, userId: string) {
    validateRequiredFields(createOrderDto, [
      'storeId',
      'packageId',
      'paymentMethodId',
      'userIdForRecharge',
    ]);
    const {
      storeId,
      packageId,
      paymentMethodId,
      userIdForRecharge,
      couponTitle,
    } = createOrderDto;

    try {
      // Check if user belongs to the store
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          storeId,
        },
      });

      if (!user) {
        throw new ForbiddenException('User does not belong to this store');
      }

      // Fetch package and payment method
      const packageData = await this.prisma.package.findUnique({
        where: { id: packageId },
        include: {
          product: true,
          paymentMethods: {
            where: {
              id: paymentMethodId,
            },
          },
        },
      });

      if (!packageData) {
        throw new NotFoundException('Package not found');
      }


      // Check if package belongs to the store
      if (packageData.storeId !== storeId) {
        throw new BadRequestException('Package does not belong to this store');
      }

      if (packageData.paymentMethods.length === 0) {
        throw new NotFoundException(
          'Payment method not available for this package',
        );
      }

      const paymentMethod = packageData.paymentMethods[0];

      // Execute all operations in a single transaction
      return await this.prisma.$transaction(async (tx) => {
        // 1. Create PackageInfo (package snapshot)
        const packageInfo = await tx.packageInfo.create({
          data: {
            packageId: packageData.id,
            name: packageData.name,
            userIdForRecharge,
            imgCardUrl: packageData.imgCardUrl,
          },
        });

        // 2. Recharge
        const recharge = await tx.recharge.create({
          data: {
            userIdForRecharge,
            status: RechargeStatus.RECHARGE_PENDING,
            amountCredits: packageData.amountCredits,
            statusUpdatedAt: new Date(),
          },
        });

        // 3. OrderItem
        const orderItem = await tx.orderItem.create({
          data: {
            productId: packageData.productId,
            productName: packageData.product.name,
            packageId: packageInfo.id,
            rechargeId: recharge.id,
          },
        });

        // 4. Payment
        const payment = await tx.payment.create({
          data: {
            name: paymentMethod.name,
            status: PaymentStatus.PAYMENT_PENDING,
            statusUpdatedAt: new Date(),
            qrCode:
              paymentMethod.name === 'pix'
                ? await this.generatePixQRCode(Number(paymentMethod.price))
                : null,
            qrCodetextCopyPaste:
              paymentMethod.name === 'pix'
                ? await this.generatePixCopyPaste(Number(paymentMethod.price))
                : null,
          },
        });

        let orderNumber;
        let existingOrder;
        do {
          // Generate a random 12-digit number
          orderNumber = this.generateOrderNumber();
          // Check if it already exists
          existingOrder = await tx.order.findUnique({
            where: { orderNumber },
          });
        } while (existingOrder); // Repeat if it already exists

        // 5. Apply coupon discount if provided
        let finalPrice = paymentMethod.price;
        let couponUsage: any = null;
        let couponValidation: any = null;

        if (couponTitle) {
          couponValidation = await this.validateCoupon(
            { couponTitle, orderAmount: Number(paymentMethod.price) },
            storeId,
            userId,
          );

          if (!couponValidation.valid) {
            throw new BadRequestException(couponValidation.message);
          }

          finalPrice = couponValidation.finalAmount;

          // Create coupon usage record
          couponUsage = await tx.couponUsage.create({
            data: {
              couponId: couponValidation.coupon.id,
              orderId: '', // Will be set after order creation
            },
          });
        }

        // 6. Create Order
        const order = await tx.order.create({
          data: {
            orderNumber,
            price: finalPrice,
            orderStatus: OrderStatus.CREATED,
            storeId,
            userId,
            paymentId: payment.id,
            orderItemId: orderItem.id,
          },
          include: {
            payment: true,
            orderItem: {
              include: {
                recharge: true,
                package: true,
              },
            },
          },
        });

        // 7. Update coupon usage with orderId (but don't confirm usage yet)
        if (couponUsage) {
          await tx.couponUsage.update({
            where: { id: couponUsage.id },
            data: { orderId: order.id },
          });
        }

        return order;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === 'P2002') {
          throw new BadRequestException('Unique constraint violation');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint violation');
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async updateInfluencerMonthlySales(
    tx: any,
    influencerId: string,
    saleAmount: number,
    saleDate: Date,
  ): Promise<void> {
    const month = saleDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const year = saleDate.getFullYear();

    // Try to find existing monthly sales record
    const existingRecord = await tx.influencerMonthlySales.findFirst({
      where: {
        influencerId,
        month,
        year,
      },
    });

    if (existingRecord) {
      // Update existing record
      await tx.influencerMonthlySales.update({
        where: {
          id: existingRecord.id,
        },
        data: {
          totalSales: {
            increment: saleAmount,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new record
      await tx.influencerMonthlySales.create({
        data: {
          influencerId,
          month,
          year,
          totalSales: saleAmount,
        },
      });
    }
  }

  /**
   * Confirm coupon usage after payment is confirmed
   * This method should be called when payment status changes to PAYMENT_APPROVED
   */
  async confirmCouponUsage(orderId: string): Promise<void> {
    try {
      // Find the order with coupon usage
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          couponUsages: {
            include: {
              coupon: {
                select: {
                  id: true,
                  influencerId: true,
                },
              },
            },
          },
        },
      });

      if (!order || order.couponUsages.length === 0) {
        return; // No coupon usage to confirm
      }

      // Use transaction to ensure data consistency
      await this.prisma.$transaction(async (tx) => {
        for (const couponUsage of order.couponUsages) {
          // Increment coupon usage count
          await tx.coupon.update({
            where: { id: couponUsage.coupon.id },
            data: {
              timesUsed: { increment: 1 },
              totalSalesAmount: { increment: order.price },
            },
          });

          // Update influencer monthly sales
          await this.updateInfluencerMonthlySales(
            tx,
            couponUsage.coupon.influencerId,
            Number(order.price),
            new Date(),
          );
        }
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking payment flow
      console.error('Error confirming coupon usage:', error);
    }
  }

  private generateOrderNumber(): string {
    // Generate a random 12-digit number
    const min = 100000000000; // 12 digits (starting with 1)
    const max = 999999999999; // 12 digits (all 9s)
    return randomInt(min, max).toString();
  }

  private async generatePixQRCode(amount: number): Promise<string> {
    // Here you would implement the real QR Code generation logic
    return `qrcode${amount}`;
  }

  private async generatePixCopyPaste(amount: number): Promise<string> {
    //
    //
    //
    //
    //
    // Here you would implement the real PIX Copy and Paste code generation logic
    //
    //
    //
    //
    //
    return `qrcode-copypaste${amount}`;
  }

  async validateCoupon(
    validateCouponDto: ValidateCouponDto,
    storeId: string,
    userId: string,
  ): Promise<any> {
    try {
      const { couponTitle, orderAmount } = validateCouponDto;

      // Find the coupon by title and store
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          title: couponTitle,
          storeId,
        },
        select: {
          id: true,
          title: true,
          discountPercentage: true,
          discountAmount: true,
          expiresAt: true,
          timesUsed: true,
          maxUses: true,
          minOrderAmount: true,
          isActive: true,
          isFirstPurchase: true,
          storeId: true,
          influencerId: true,
        },
      });

      if (!coupon) {
        return { valid: false, message: 'Coupon not found' };
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return { valid: false, message: 'Coupon is not active' };
      }

      // Check if coupon has expired
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return { valid: false, message: 'Coupon has expired' };
      }

      // Check if usage limit reached
      if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }

      // Check minimum order amount
      if (
        coupon.minOrderAmount &&
        orderAmount < Number(coupon.minOrderAmount)
      ) {
        return {
          valid: false,
          message: `Minimum order amount required: ${coupon.minOrderAmount}`,
        };
      }

      // Check if this is a first purchase coupon and if user is eligible
      if (coupon.isFirstPurchase) {
        const userOrderCount = await this.prisma.order.count({
          where: {
            userId: userId, // We need to pass userId to this method
            storeId: storeId,
            orderStatus: {
              not: 'EXPIRED', // Exclude expired orders
            },
          },
        });

        if (userOrderCount > 0) {
          return {
            valid: false,
            message: 'First purchase coupon can only be used by new customers',
          };
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountPercentage) {
        discountAmount =
          (orderAmount * Number(coupon.discountPercentage)) / 100;
      } else if (coupon.discountAmount) {
        discountAmount = Math.min(Number(coupon.discountAmount), orderAmount);
      }

      const finalAmount = orderAmount - discountAmount;

      return {
        valid: true,
        discountAmount,
        finalAmount: Math.max(0, finalAmount),
        coupon: {
          id: coupon.id,
          title: coupon.title,
          discountPercentage: coupon.discountPercentage,
          discountAmount: coupon.discountAmount,
          isFirstPurchase: coupon.isFirstPurchase,
        },
      };
    } catch {
      return { valid: false, message: 'Failed to validate coupon' };
    }
  }

  async applyCoupon(
    couponTitle: string,
    orderAmount: number,
    storeId: string,
    userId: string,
  ): Promise<any> {
    try {
      const validation = await this.validateCoupon(
        { couponTitle, orderAmount },
        storeId,
        userId,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }

      return validation;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to apply coupon');
    }
  }
}
