import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, RechargeStatus } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { validateRequiredFields } from 'src/utils/validation.util';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: string, userId: string) {
    try {
      // Verifica se o usuário pertence à loja
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          storeId,
        },
      });

      if (!user) {
        throw new ForbiddenException('User does not belong to this store');
      }

      return await this.prisma.order.findMany({
        where: {
          storeId: user.storeId,
          userId, // Filtra apenas pedidos do usuário
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
      });
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
          userId, // Garante que o usuário só veja seus próprios pedidos
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
    // Validação dos campos obrigatórios
    validateRequiredFields(createOrderDto, [
      'storeId',
      'packageId',
      'paymentMethodId',
      'userIdForRecharge',
    ]);
    const { storeId, packageId, paymentMethodId, userIdForRecharge } = createOrderDto;

    try {
      // Verifica se o usuário pertence à loja
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          storeId,
        },
      });

      if (!user) {
        throw new ForbiddenException('User does not belong to this store');
      }

      // Busca o pacote e o método de pagamento
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

      // Verifica se o pacote pertence à loja
      if (packageData.storeId !== storeId) {
        throw new BadRequestException('Package does not belong to this store');
      }

      if (packageData.paymentMethods.length === 0) {
        throw new NotFoundException(
          'Payment method not available for this package',
        );
      }

      const paymentMethod = packageData.paymentMethods[0];

      // Executa todas as operações em uma única transação
      return await this.prisma.$transaction(async (tx) => {
        // 1. Cria PackageInfo (snapshot do pacote)
        const packageInfo = await tx.packageInfo.create({
          data: {
            packageId: packageData.id,
            name: packageData.name,
            userIdForRecharge,
            imgCardUrl: packageData.imgCardUrl,
          },
        });

        // 2. Cria Recharge
        const recharge = await tx.recharge.create({
          data: {
            userIdForRecharge,
            status: RechargeStatus.RECHARGE_PENDING,
            amountCredits: packageData.amountCredits,
            statusUpdatedAt: new Date(),
          },
        });

        // 3. Cria OrderItem
        const orderItem = await tx.orderItem.create({
          data: {
            productId: packageData.productId,
            productName: packageData.product.name,
            packageId: packageInfo.id,
            rechargeId: recharge.id,
          },
        });

        // 4. Cria Payment
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
          // Gera um número aleatório de 12 dígitos
          orderNumber = this.generateOrderNumber();
          // Verifica se já existe
          existingOrder = await tx.order.findUnique({
            where: { orderNumber },
          });
        } while (existingOrder); // Repete se já existir

        // 5. Finalmente, cria Order
        const order = await tx.order.create({
          data: {
            orderNumber,
            price: paymentMethod.price,
            orderStatus: OrderStatus.CREATED,
            storeId,
            userId, // Adiciona o ID do usuário que criou o pedido
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
        // Trata erros específicos do Prisma
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
    // Gera um número aleatório de 12 dígitos
    const min = 100000000000; // 12 dígitos (começando com 1)
    const max = 999999999999; // 12 dígitos (todos 9)
    return randomInt(min, max).toString();
  }

  private async generatePixQRCode(amount: number): Promise<string> {
    // Aqui você implementaria a lógica real de geração do QR Code
    return `qrcode${amount}`;
  }

  private async generatePixCopyPaste(amount: number): Promise<string> {
    // Aqui você implementaria a lógica real de geração do código PIX Copia e Cola
    return `qrcode-copypaste${amount}`;
  }
}
