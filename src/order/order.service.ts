import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RechargeStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { validateRequiredFields } from 'src/utils/validation.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { BraviveService } from '../bravive/bravive.service';
import { StoreService } from '../store/store.service';
import { CreatePaymentDto, PaymentMethod } from '../bravive/dto/create-payment.dto';
import { BigoService } from '../bigo/bigo.service';
import { env } from '../env';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BraviveService))
    private readonly braviveService: BraviveService,
    private readonly storeService: StoreService,
    private readonly bigoService: BigoService,
  ) {}

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

      const totalPages = Math.ceil(totalOrders / limit);

      const dataWithCustomizedImages = await this.applyStoreProductImages(data);
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

      const totalPages = Math.ceil(totalOrders / limit);

      const dataWithCustomizedImages = await this.applyStoreProductImages(data);
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

      const [customizedOrder] = await this.applyStoreProductImages([order]);
      return customizedOrder;
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

      // Validate recharge precheck before creating order
      const seqid = `precheck_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`.substring(0, 32);
      await this.bigoService.rechargePrecheck({
        recharge_bigoid: userIdForRecharge,
        seqid: seqid,
      });

      // Execute all operations in a single transaction
      const order = await this.prisma.$transaction(async (tx) => {
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
            qrCode: null,
            qrCodetextCopyPaste: null,
          },
        });

        let orderNumber: string;
        let existingOrder: any;
        let attempts = 0;
        const maxAttempts = 5; // Safety limit

        do {
          // Generate order number with Base36 encoding
          orderNumber = this.generateOrderNumber(storeId);
          // Check if it already exists (very rare with Base36 + random)
          existingOrder = await tx.order.findUnique({
            where: { orderNumber },
          });
          attempts++;

          if (attempts >= maxAttempts) {
            throw new BadRequestException('Failed to generate unique order number');
          }
        } while (existingOrder);

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

      // After transaction: Integrate with Bravive if token is configured
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              documentValue: true,
              documentType: true,
            },
          },
        },
      });

      if (!createdOrder) {
        throw new NotFoundException('Order not found after creation');
      }

      // Only integrate with Bravive if payment method is PIX
      if (paymentMethod.name === 'pix') {
        try {
          // Get Bravive token from store
          const braviveToken = await this.storeService.getBraviveToken(storeId);

          if (braviveToken) {
            // Prepare payment data for Bravive
            const bravivePaymentDto: CreatePaymentDto = {
              amount: Math.round(Number(createdOrder.price) * 100), // Convert to cents
              currency: 'BRL',
              description: `Pedido ${createdOrder.orderNumber} - ${packageData.name}`,
              payer_name: createdOrder.user.name,
              payer_email: createdOrder.user.email,
              payer_phone: createdOrder.user.phone,
              payer_document: createdOrder.user.documentValue,
              method: PaymentMethod.PIX,
              webhook_url: `${env.BASE_URL}/bravive/webhook`,
            };

            // Create payment in Bravive
            const braviveResponse = await this.braviveService.createPayment(
              bravivePaymentDto,
              braviveToken,
            );

            // Update Payment with Bravive data
            await this.prisma.payment.update({
              where: { id: createdOrder.payment.id },
              data: {
                paymentProvider: 'bravive',
                externalId: braviveResponse.id,
                qrCode: braviveResponse.pix_qr_code || null,
                qrCodetextCopyPaste: braviveResponse.pix_code || null,
              },
            });

            // Fetch updated order with payment data
            return await this.prisma.order.findUnique({
              where: { id: createdOrder.id },
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
          }
        } catch (braviveError) {
          // Log error but don't fail the order creation
          // Payment will remain with null QR code, can be retried later
          console.error('Failed to create payment in Bravive:', braviveError);
        }
      }

      return createdOrder;
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

  private async updateStoreDailySales(
    tx: any,
    storeId: string,
    saleAmount: number,
    saleDate: Date,
  ): Promise<void> {
    // Get date without time (only year, month, day)
    const dateOnly = new Date(
      saleDate.getFullYear(),
      saleDate.getMonth(),
      saleDate.getDate(),
    );

    const existing = await tx.storeDailySales.findFirst({
      where: {
        storeId,
        date: dateOnly,
      },
    });

    if (existing) {
      await tx.storeDailySales.update({
        where: {
          id: existing.id,
        },
        data: {
          totalSales: {
            increment: saleAmount,
          },
          totalOrders: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.storeDailySales.create({
        data: {
          storeId,
          date: dateOnly,
          totalSales: saleAmount,
          totalOrders: 1,
        },
      });
    }
  }

  private async updateStoreMonthlySales(
    tx: any,
    storeId: string,
    saleAmount: number,
    saleDate: Date,
    orderStatus: OrderStatus,
    hasCoupon: boolean,
    isNewCustomer: boolean,
  ): Promise<void> {
    const month = saleDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const year = saleDate.getFullYear();

    const existingRecord = await tx.storeMonthlySales.findFirst({
      where: {
        storeId,
        month,
        year,
      },
    });

    const updateData: any = {
      totalSales: { increment: saleAmount },
      totalOrders: { increment: 1 },
      updatedAt: new Date(),
    };

    // Update order status counts
    if (orderStatus === 'COMPLETED') {
      updateData.totalCompletedOrders = { increment: 1 };
    } else if (orderStatus === 'EXPIRED') {
      updateData.totalExpiredOrders = { increment: 1 };
    } else if (orderStatus === 'REFOUNDED') {
      updateData.totalRefundedOrders = { increment: 1 };
    }

    // Update coupon metrics
    if (hasCoupon) {
      updateData.ordersWithCoupon = { increment: 1 };
    } else {
      updateData.ordersWithoutCoupon = { increment: 1 };
    }

    // Update customer metrics
    if (isNewCustomer) {
      updateData.newCustomers = { increment: 1 };
    }
    updateData.totalCustomers = { increment: 1 };

    if (existingRecord) {
      await tx.storeMonthlySales.update({
        where: {
          id: existingRecord.id,
        },
        data: updateData,
      });
    } else {
      // Create new record with initial values
      await tx.storeMonthlySales.create({
        data: {
          storeId,
          month,
          year,
          totalSales: saleAmount,
          totalOrders: 1,
          totalCompletedOrders: orderStatus === 'COMPLETED' ? 1 : 0,
          totalExpiredOrders: orderStatus === 'EXPIRED' ? 1 : 0,
          totalRefundedOrders: orderStatus === 'REFOUNDED' ? 1 : 0,
          totalCustomers: 1,
          newCustomers: isNewCustomer ? 1 : 0,
          ordersWithCoupon: hasCoupon ? 1 : 0,
          ordersWithoutCoupon: !hasCoupon ? 1 : 0,
        },
      });
    }
  }

  private async updateStoreMonthlySalesByProduct(
    tx: any,
    storeId: string,
    productId: string,
    saleAmount: number,
    saleDate: Date,
  ): Promise<void> {
    const month = saleDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const year = saleDate.getFullYear();

    const existing = await tx.storeMonthlySalesByProduct.findFirst({
      where: {
        storeId,
        productId,
        month,
        year,
      },
    });

    if (existing) {
      await tx.storeMonthlySalesByProduct.update({
        where: {
          id: existing.id,
        },
        data: {
          totalSales: {
            increment: saleAmount,
          },
          totalOrders: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.storeMonthlySalesByProduct.create({
        data: {
          storeId,
          productId,
          month,
          year,
          totalSales: saleAmount,
          totalOrders: 1,
        },
      });
    }
  }

  /**
   * Update store sales metrics when an order is completed
   *
   * This method should be called whenever an order status changes to COMPLETED.
   * It updates all store metrics: daily sales, monthly sales (detailed), and monthly sales by product.
   *
   * IMPORTANT: Call this method in the following scenarios:
   * 1. When payment webhook confirms payment approval (PAYMENT_APPROVED)
   * 2. When order status is manually updated to COMPLETED
   * 3. When recharge is successfully processed
   * 4. Inside confirmCouponUsage (already implemented)
   *
   * Future implementations to consider:
   * - Payment webhook handler (Mercado Pago, PicPay, PayPal, etc.)
   * - Automatic order completion after payment approval
   * - Manual order status update endpoint
   *
   * @param orderId - The order ID to update metrics for
   * @param tx - Optional transaction object (if already in a transaction)
   *
   * @example
   * // When payment webhook is received:
   * await this.updateStoreSalesMetrics(orderId);
   *
   * // Inside an existing transaction:
   * await this.updateStoreSalesMetrics(orderId, tx);
   */
  async updateStoreSalesMetrics(orderId: string, tx?: any): Promise<void> {
    try {
      const executeUpdate = async (transaction: any) => {
        // Find the order with all necessary data
        const order = await transaction.order.findUnique({
          where: { id: orderId },
          include: {
            orderItem: {
              select: {
                productId: true,
              },
            },
            couponUsages: {
              select: {
                id: true,
              },
            },
            user: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!order || order.orderStatus !== 'COMPLETED') {
          return; // Only update metrics for completed orders
        }

        const storeId = order.storeId;
        const productId = order.orderItem?.productId;
        const saleAmount = Number(order.price);
        const saleDate = order.createdAt;
        const hasCoupon = order.couponUsages.length > 0;

        // Check if this is a new customer (no previous completed orders)
        const previousOrderCount = await transaction.order.count({
          where: {
            userId: order.userId,
            storeId: order.storeId,
            orderStatus: 'COMPLETED',
            id: { not: orderId }, // Exclude current order
            createdAt: { lt: order.createdAt }, // Orders before this one
          },
        });
        const isNewCustomer = previousOrderCount === 0;

        // Update daily sales
        await this.updateStoreDailySales(
          transaction,
          storeId,
          saleAmount,
          saleDate,
        );

        // Update monthly sales (detailed metrics)
        await this.updateStoreMonthlySales(
          transaction,
          storeId,
          saleAmount,
          saleDate,
          order.orderStatus,
          hasCoupon,
          isNewCustomer,
        );

        // Update monthly sales by product (if productId exists)
        if (productId) {
          await this.updateStoreMonthlySalesByProduct(
            transaction,
            storeId,
            productId,
            saleAmount,
            saleDate,
          );
        }

        // TODO: Future implementation - Add payment method metrics here
        // Example:
        // await this.updateStoreMonthlySalesByPaymentMethod(
        //   transaction,
        //   storeId,
        //   order.payment.name,
        //   saleAmount,
        //   saleDate,
        // );
      };

      if (tx) {
        // If already in a transaction, use it
        await executeUpdate(tx);
      } else {
        // Otherwise, create a new transaction
        await this.prisma.$transaction(executeUpdate);
      }
    } catch (error) {
      // Log error but don't throw to avoid breaking payment flow
      console.error('Error updating store sales metrics:', error);
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

        // Update store sales metrics (daily, monthly, by product)
        // This will only update if order status is COMPLETED
        await this.updateStoreSalesMetrics(orderId, tx);
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking payment flow
      console.error('Error confirming coupon usage:', error);
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
