import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RechargeStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { getHoursAgoInBrazil } from 'src/utils/date.util';
import { validateRequiredFields } from 'src/utils/validation.util';
import { BigoService } from '../bigo/bigo.service';
import { BraviveService } from '../bravive/bravive.service';
import {
  CreatePaymentDto,
  PaymentMethod,
} from '../bravive/dto/create-payment.dto';
import { env } from '../env';
import { PrismaService } from '../prisma/prisma.service';
import { StoreService } from '../store/store.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly orderExpirationHours: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BraviveService))
    private readonly braviveService: BraviveService,
    private readonly storeService: StoreService,
    private readonly bigoService: BigoService,
  ) {
    this.orderExpirationHours = env.ORDER_EXPIRATION_HOURS;
  }

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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
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

      // Check and expire orders before returning
      const orderIds = data.map((order) => order.id);
      const expiredCount = await this.checkAndExpireOrders(
        user.storeId,
        orderIds,
      );

      // If orders were expired, fetch again with same filters to get updated statuses
      let finalData = data;
      if (expiredCount > 0) {
        finalData = await this.prisma.order.findMany({
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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        });
      }

      const totalPages = Math.ceil(totalOrders / limit);

      const dataWithCustomizedImages =
        await this.applyStoreProductImages(finalData);
      const products = await this.getStoreProducts(user.storeId);

      return {
        data: dataWithCustomizedImages,
        totalOrders,
        page,
        totalPages,
        products,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async findAllByStore(
    storeId: string,
    page = 1,
    limit = 6,
    search?: string,
    status?: string,
    productId?: string,
  ) {
    try {
      const where: Prisma.OrderWhereInput = {
        storeId,
      };

      const normalizedSearch = search?.trim();
      if (normalizedSearch) {
        where.OR = [
          {
            orderNumber: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          {
            user: {
              email: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      const normalizedStatus = status?.trim();
      if (normalizedStatus && normalizedStatus.toLowerCase() !== 'all') {
        const statusUppercase = normalizedStatus.toUpperCase();
        if (
          !Object.values(OrderStatus).includes(statusUppercase as OrderStatus)
        ) {
          throw new BadRequestException('Invalid order status');
        }
        where.orderStatus = statusUppercase as OrderStatus;
      }

      const normalizedProductId = productId?.trim();
      if (normalizedProductId) {
        where.orderItem = {
          is: {
            productId: normalizedProductId,
          },
        };
      }

      const [data, totalOrders] = await Promise.all([
        this.prisma.order.findMany({
          where,
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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
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
          where,
        }),
      ]);

      // Check and expire orders before returning
      const orderIds = data.map((order) => order.id);
      const expiredCount = await this.checkAndExpireOrders(storeId, orderIds);

      // If orders were expired, fetch again with same filters to get updated statuses
      let finalData = data;
      if (expiredCount > 0) {
        finalData = await this.prisma.order.findMany({
          where,
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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        });
      }

      const totalPages = Math.ceil(totalOrders / limit);

      const dataWithCustomizedImages =
        await this.applyStoreProductImages(finalData);
      const products = await this.getStoreProducts(storeId);

      return {
        data: dataWithCustomizedImages,
        totalOrders,
        page,
        totalPages,
        products,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async applyStoreProductImages(orders: any[]) {
    if (!orders || orders.length === 0) {
      return orders;
    }

    const relevantEntries = orders
      .filter(
        (order) =>
          order?.storeId &&
          order?.orderItem?.productId &&
          order.orderItem.package,
      )
      .map((order) => ({
        storeId: order.storeId as string,
        productId: order.orderItem.productId as string,
      }));

    if (relevantEntries.length === 0) {
      return orders;
    }

    const storeIds = Array.from(
      new Set(relevantEntries.map((entry) => entry.storeId)),
    );
    const productIds = Array.from(
      new Set(relevantEntries.map((entry) => entry.productId)),
    );

    const storeProductSettingsPromise =
      storeIds.length > 0 && productIds.length > 0
        ? this.prisma.storeProductSettings.findMany({
            where: {
              storeId: { in: storeIds },
              productId: { in: productIds },
            },
            select: {
              storeId: true,
              productId: true,
              imgCardUrl: true,
            },
          })
        : Promise.resolve([]);

    const productsPromise =
      productIds.length > 0
        ? this.prisma.product.findMany({
            where: {
              id: { in: productIds },
            },
            select: {
              id: true,
              imgCardUrl: true,
            },
          })
        : Promise.resolve([]);

    const [storeProductSettings, products] = await Promise.all([
      storeProductSettingsPromise,
      productsPromise,
    ]);

    const storeImageMap = new Map<string, string>();
    for (const setting of storeProductSettings) {
      if (setting.imgCardUrl) {
        storeImageMap.set(
          `${setting.storeId}:${setting.productId}`,
          setting.imgCardUrl,
        );
      }
    }

    const productImageMap = new Map<string, string>();
    for (const product of products) {
      if (product.imgCardUrl) {
        productImageMap.set(product.id, product.imgCardUrl);
      }
    }

    return orders.map((order) => {
      const productId = order?.orderItem?.productId;
      const packageInfo = order?.orderItem?.package;
      if (!productId || !packageInfo) {
        return order;
      }

      const storeKey = `${order.storeId}:${productId}`;
      const replacementImg =
        storeImageMap.get(storeKey) ??
        productImageMap.get(productId) ??
        packageInfo.imgCardUrl;

      if (replacementImg === packageInfo.imgCardUrl) {
        return order;
      }

      return {
        ...order,
        orderItem: {
          ...order.orderItem,
          package: {
            ...packageInfo,
            imgCardUrl: replacementImg,
          },
        },
      };
    });
  }

  private async getStoreProducts(storeId: string) {
    const packages = await this.prisma.package.findMany({
      where: {
        storeId,
        isActive: true,
      },
      select: {
        productId: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    const productMap = new Map<string, string>();
    for (const pkg of packages) {
      if (pkg.productId && pkg.product?.name) {
        productMap.set(pkg.productId, pkg.product.name);
      }
    }

    return Array.from(productMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const expiredCount = await this.checkAndExpireOrders(undefined, [id]);

      let finalOrder = order;
      if (expiredCount > 0) {
        const refreshedOrder = await this.prisma.order.findFirst({
          where: {
            id,
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
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        if (!refreshedOrder) {
          throw new NotFoundException('Order not found');
        }
        finalOrder = refreshedOrder;
      }

      const [customizedOrder] = await this.applyStoreProductImages([
        finalOrder,
      ]);
      return customizedOrder;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private sanitizeValuesToGetNumbersOnly(text: string): string {
    return text.replace(/\D/g, '');
  }

  async create(
    createOrderDto: CreateOrderDto,
    storeId: string,
    userId: string,
  ) {
    validateRequiredFields(createOrderDto, [
      'packageId',
      'paymentMethodId',
      'userIdForRecharge',
      'price',
    ]);

    const {
      packageId,
      paymentMethodId,
      userIdForRecharge,
      couponTitle,
      price,
    } = createOrderDto;

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          storeId,
        },
      });

      if (!user) {
        throw new ForbiddenException('User does not belong to this store');
      }

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

      if (packageData.storeId !== storeId) {
        throw new BadRequestException('Package does not belong to this store');
      }

      if (packageData.paymentMethods.length === 0) {
        throw new NotFoundException(
          'Payment method not available for this package',
        );
      }

      const paymentMethod = packageData.paymentMethods[0];

      try {
        await this.bigoService.rechargePrecheck({
          recharge_bigoid: userIdForRecharge,
        });
      } catch (precheckError) {
        this.logger.error(`Precheck failed: ${precheckError.message}`);
        throw new BadRequestException('Invalid userId for recharge');
      }

      const basePriceNumber = Number(Number(paymentMethod.price).toFixed(2));
      let finalPrice: number | any = paymentMethod.price;
      let couponValidation: any = null;

      if (couponTitle) {
        couponValidation = await this.validateCoupon(
          { couponTitle, orderAmount: Number(paymentMethod.price) },
          storeId,
          userId,
          userIdForRecharge,
        );

        if (!couponValidation.valid) {
          throw new BadRequestException(couponValidation.message);
        }

        finalPrice = couponValidation.finalAmount;
      }

      const finalPriceNumber = Number(Number(finalPrice).toFixed(2));

      const calculatedPrice = finalPriceNumber;
      const receivedPrice = Number(price);

      if (Math.abs(calculatedPrice - receivedPrice) > 0.01) {
        throw new BadRequestException(
          `Price mismatch: calculated price (${calculatedPrice}) does not match provided price (${receivedPrice})`,
        );
      }

      let orderNumber: string;
      let existingOrder: any;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        orderNumber = this.generateOrderNumber(storeId);
        existingOrder = await this.prisma.order.findUnique({
          where: { orderNumber },
        });
        attempts++;

        if (attempts >= maxAttempts) {
          throw new BadRequestException(
            'Failed to generate unique order number',
          );
        }
      } while (existingOrder);

      // Check for recent order with same characteristics
      // Note: We check price separately after fetching because Prisma Decimal comparison is complex
      const recentOrder = await this.prisma.order.findFirst({
        where: {
          userId,
          storeId,
          orderItem: {
            package: {
              packageId: packageData.id,
            },
            recharge: {
              userIdForRecharge, // Must have same userIdForRecharge
            },
          },
          createdAt: {
            gte: new Date(Date.now() - 5000),
          },
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

      // Only return recent order if it matches the current request characteristics
      if (recentOrder) {
        // Don't return recent order if it's already been processed
        // (payment approved or order completed/processing)
        // This prevents issues where the webhook tries to process with a different braviveId
        if (
          recentOrder.payment.status !== PaymentStatus.PAYMENT_PENDING ||
          (recentOrder.orderStatus !== OrderStatus.CREATED &&
            recentOrder.orderStatus !== OrderStatus.EXPIRED)
        ) {
          // Recent order already processed, continue to create new order
        } else {
          // Check if price matches (with tolerance for decimal precision)
          const recentOrderPrice = Number(recentOrder.price);
          const priceMatches =
            Math.abs(recentOrderPrice - finalPriceNumber) < 0.01;

          if (!priceMatches) {
            // Price doesn't match, continue to create new order
          } else {
            // Price matches, check coupon
            // If current request has a coupon, recent order must have the same coupon
            if (couponValidation) {
              const recentOrderCoupon = recentOrder.couponUsages?.[0]?.coupon;
              if (
                !recentOrderCoupon ||
                recentOrderCoupon.id !== couponValidation.coupon.id
              ) {
                // Recent order doesn't match coupon, continue to create new order
              } else {
                // Recent order matches all criteria (price, coupon, userIdForRecharge, not processed), return it
                return {
                  ...recentOrder,
                  price: Number(Number(recentOrder.price).toFixed(2)),
                  basePrice: Number(Number(recentOrder.basePrice).toFixed(2)),
                };
              }
            } else {
              // Current request has no coupon, recent order must also have no coupon
              if (recentOrder.couponUsages?.length === 0) {
                // Recent order matches all criteria (price, no coupon, userIdForRecharge, not processed), return it
                return {
                  ...recentOrder,
                  price: Number(Number(recentOrder.price).toFixed(2)),
                  basePrice: Number(Number(recentOrder.basePrice).toFixed(2)),
                };
              }
              // Recent order has coupon but current request doesn't, continue to create new order
            }
          }
        }
      }

      let braviveResponse: any = null;
      if (paymentMethod.name.toLowerCase() === 'pix') {
        const braviveToken = await this.storeService.getBraviveToken(storeId);

        if (!braviveToken) {
          throw new BadRequestException(
            'Payment processing failed: Bravive token not configured',
          );
        }

        if (!user.phone || user.phone.trim() === '') {
          throw new BadRequestException(
            'Payment processing failed: User phone is required',
          );
        }

        if (!user.documentValue || user.documentValue.trim() === '') {
          throw new BadRequestException(
            'Payment processing failed: User document is required',
          );
        }

        const bravivePaymentDto: CreatePaymentDto = {
          amount: Math.round(finalPriceNumber * 100),
          currency: 'BRL',
          description: `Pedido ${orderNumber} - ${packageData.name}`,
          payer_name: user.name,
          payer_email: user.email,
          payer_phone: this.sanitizeValuesToGetNumbersOnly(user.phone),
          payer_document: this.sanitizeValuesToGetNumbersOnly(
            user.documentValue,
          ),
          method: PaymentMethod.PIX,
        };

        try {
          braviveResponse = await this.braviveService.createPayment(
            bravivePaymentDto,
            braviveToken,
          );
        } catch (error) {
          const errorMessage = error.message || 'Unknown error';
          throw new BadRequestException(
            `Payment processing failed: ${errorMessage}`,
          );
        }
      }

      const order = await this.prisma.$transaction(async (tx) => {
        const packageInfo = await tx.packageInfo.create({
          data: {
            packageId: packageData.id,
            name: packageData.name,
            userIdForRecharge,
            imgCardUrl: packageData.imgCardUrl,
          },
        });

        const recharge = await tx.recharge.create({
          data: {
            userIdForRecharge,
            status: RechargeStatus.RECHARGE_PENDING,
            amountCredits: packageData.amountCredits,
            statusUpdatedAt: new Date(),
          },
        });

        const orderItem = await tx.orderItem.create({
          data: {
            productId: packageData.productId,
            productName: packageData.product.name,
            packageId: packageInfo.id,
            rechargeId: recharge.id,
          },
        });

        const payment = await tx.payment.create({
          data: {
            name: paymentMethod.name,
            status: PaymentStatus.PAYMENT_PENDING,
            statusUpdatedAt: new Date(),
            qrCode: braviveResponse?.pix_qr_code || null,
            qrCodetextCopyPaste: braviveResponse?.pix_code || null,
            paymentProvider: braviveResponse ? 'bravive' : null,
            braviveId: braviveResponse?.id || null,
          },
        });

        const order = await tx.order.create({
          data: {
            orderNumber,
            price: finalPriceNumber,
            basePrice: basePriceNumber,
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

        if (couponValidation) {
          await tx.couponUsage.create({
            data: {
              couponId: couponValidation.coupon.id,
              orderId: order.id,
            },
          });
        }

        return order;
      });

      const createdOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
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

      if (!createdOrder) {
        throw new NotFoundException('Order not found after creation');
      }

      return {
        ...createdOrder,
        price: Number(Number(createdOrder.price).toFixed(2)),
        basePrice: Number(Number(createdOrder.basePrice).toFixed(2)),
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Order with this number already exists',
          );
        }
        throw new BadRequestException('Database error while creating order');
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
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (saleAmount >= 0) {
        updateData.totalSales = { increment: saleAmount };
      } else {
        updateData.totalSales = { decrement: Math.abs(saleAmount) };
      }

      await tx.influencerMonthlySales.update({
        where: {
          id: existingRecord.id,
        },
        data: updateData,
      });
    } else {
      if (saleAmount < 0) {
        throw new Error('Cannot create new record with negative sale amount');
      }
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
      this.logger.error('Error confirming coupon usage:', error);
    }
  }

  async revertCouponUsage(orderId: string, tx?: any): Promise<void> {
    try {
      const executeRevert = async (transaction: any) => {
        const order = await transaction.order.findUnique({
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
          return;
        }

        for (const couponUsage of order.couponUsages) {
          await transaction.coupon.update({
            where: { id: couponUsage.coupon.id },
            data: {
              timesUsed: { decrement: 1 },
              totalSalesAmount: { decrement: order.price },
            },
          });

          await this.updateInfluencerMonthlySales(
            transaction,
            couponUsage.coupon.influencerId,
            -Number(order.price),
            order.createdAt,
          );
        }
      };

      if (tx) {
        await executeRevert(tx);
      } else {
        await this.prisma.$transaction(executeRevert);
      }
    } catch (error) {
      this.logger.error('Error reverting coupon usage:', error);
    }
  }

  /**
   * Converts a number to Base36 (0-9, A-Z)
   */
  private toBase36(num: number): string {
    return num.toString(36).toUpperCase();
  }

  /**
   * Generates order number using Base36 encoding
   * Format: {TIMESTAMP_BASE36}{STORE_HASH}{RANDOM_BASE36}
   * Example: K8J3M2A3B284 (12 characters)
   */
  private generateOrderNumber(storeId: string): string {
    // 1. Timestamp in Base36 (last 6-7 characters for compactness)
    const timestamp = this.toBase36(Date.now()).slice(-6);

    // 2. Store ID hash (4 characters from MD5)
    const hash = createHash('md5')
      .update(storeId)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    // 3. Random in Base36 (2 characters, 0-1295 range)
    const random = this.toBase36(Math.floor(Math.random() * 1296)).padStart(
      2,
      '0',
    );

    return `${timestamp}${hash}${random}`;
  }

  async validateCoupon(
    validateCouponDto: ValidateCouponDto,
    storeId: string,
    userId: string,
    bigoId?: string,
  ): Promise<any> {
    try {
      const { couponTitle, orderAmount } = validateCouponDto;

      const coupon = await this.prisma.coupon.findFirst({
        where: {
          title: couponTitle,
          storeId,
          deletedAt: null,
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
          isOneTimePerBigoId: true,
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

      // Check if this coupon can only be used once per bigoId
      if (coupon.isOneTimePerBigoId) {
        if (!bigoId) {
          return {
            valid: false,
            message: 'bigoId is required for this coupon validation',
          };
        }

        // Check if already exists a CouponUsage for this coupon with the same bigoId
        const existingUsage = await this.prisma.couponUsage.findFirst({
          where: {
            couponId: coupon.id,
            order: {
              orderItem: {
                recharge: {
                  userIdForRecharge: bigoId,
                },
              },
            },
          },
        });

        if (existingUsage) {
          return {
            valid: false,
            message: 'This coupon can only be used once per bigoId',
          };
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountPercentage) {
        discountAmount = Number(
          ((orderAmount * Number(coupon.discountPercentage)) / 100).toFixed(2),
        );
      } else if (coupon.discountAmount) {
        discountAmount = Number(
          Math.min(Number(coupon.discountAmount), orderAmount).toFixed(2),
        );
      }

      const finalAmount = Number((orderAmount - discountAmount).toFixed(2));

      return {
        valid: true,
        discountAmount,
        finalAmount: Number(Math.max(0, finalAmount).toFixed(2)),
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

  async validateCouponByPackage(
    packageId: string,
    paymentMethodId: string,
    couponTitle: string,
    storeId: string,
    userId: string,
    bigoId?: string,
  ): Promise<any> {
    // Fetch package and payment method
    const packageData = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: {
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
    const orderAmount = Number(paymentMethod.price);

    // Validate coupon with the calculated order amount
    return await this.validateCoupon(
      { couponTitle, orderAmount },
      storeId,
      userId,
      bigoId,
    );
  }

  /**
   * Checks and expires orders that have been unpaid for more than the configured hours
   * (default: 24 hours, configurable via ORDER_EXPIRATION_HOURS env variable)
   * Only updates order status, does NOT modify metrics
   * @param storeId Optional - filter by specific store
   * @param orderIds Optional - check only specific order IDs
   * @param maxDate Optional - limit check to orders created up to this date
   * @returns Number of orders updated to EXPIRED status
   */
  async checkAndExpireOrders(
    storeId?: string,
    orderIds?: string[],
    maxDate?: Date,
  ): Promise<number> {
    try {
      const expirationTimeAgo = getHoursAgoInBrazil(this.orderExpirationHours);

      const createdAtFilter: Prisma.DateTimeFilter = {
        lt: expirationTimeAgo,
      };

      if (maxDate) {
        const maxDateEndOfDay = new Date(maxDate);
        maxDateEndOfDay.setHours(23, 59, 59, 999);
        createdAtFilter.lte = maxDateEndOfDay;
      }

      const where: Prisma.OrderWhereInput = {
        orderStatus: OrderStatus.CREATED,
        payment: {
          status: PaymentStatus.PAYMENT_PENDING,
        },
        createdAt: createdAtFilter,
      };

      if (storeId) {
        where.storeId = storeId;
      }

      if (orderIds && orderIds.length > 0) {
        where.id = { in: orderIds };
      }

      const result = await this.prisma.order.updateMany({
        where,
        data: {
          orderStatus: OrderStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Expired ${result.count} order(s)${storeId ? ` for store ${storeId}` : ''}${maxDate ? ` up to ${maxDate.toISOString().split('T')[0]}` : ''}`,
        );
      }

      return result.count;
    } catch (error) {
      this.logger.error('Error checking and expiring orders:', error);
      return 0;
    }
  }
}
