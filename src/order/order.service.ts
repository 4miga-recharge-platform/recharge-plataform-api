import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, RechargeStatus } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { validateRequiredFields } from 'src/utils/validation.util';

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
            userId
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
    const { storeId, packageId, paymentMethodId, userIdForRecharge } = createOrderDto;

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
              id: paymentMethodId
            }
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
            qrCode: paymentMethod.name === 'pix' ? await this.generatePixQRCode(Number(paymentMethod.price)) : null,
            qrCodetextCopyPaste: paymentMethod.name === 'pix' ? await this.generatePixCopyPaste(Number(paymentMethod.price)) : null,
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

        // 5. Create Order
        const order = await tx.order.create({
          data: {
            orderNumber,
            price: paymentMethod.price,
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
}
