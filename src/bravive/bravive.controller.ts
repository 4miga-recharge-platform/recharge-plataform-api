import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { LoggedUser } from '../auth/logged-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StoreService } from '../store/store.service';
import { User } from '../user/entities/user.entity';
import { BraviveService } from './bravive.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('bravive')
@Controller('bravive')
export class BraviveController {
  constructor(
    private readonly braviveService: BraviveService,
    private readonly storeService: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Receive payment webhook from Bravive' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(@Body() webhookDto: any) {
    try {
      await this.braviveService.handleWebhook(webhookDto);
      return { message: 'Webhook received' };
    } catch (error) {
      return {
        message: 'Webhook received but error occurred',
        error: error.message,
      };
    }
  }

  @Post('payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment in Bravive' })
  @ApiResponse({
    status: 200,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or Bravive token not configured',
  })
  @ApiResponse({
    status: 401,
    description: 'Authorization not provided',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @LoggedUser() user: User,
  ) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const token = await this.storeService.getBraviveToken(user.storeId);
    if (!token) {
      throw new BadRequestException(
        'Bravive token not configured for this store',
      );
    }

    return this.braviveService.createPayment(createPaymentDto, token);
  }

  @Get('payments/:id')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bravive token not configured for this store',
  })
  async getPayment(@Param('id') id: string, @LoggedUser() user: User) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const token = await this.storeService.getBraviveToken(user.storeId);
    if (!token) {
      throw new BadRequestException(
        'Bravive token not configured for this store',
      );
    }

    return this.braviveService.getPayment(id, token);
  }

  @Get('payments')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
  @ApiQuery({
    name: 'method',
    required: false,
    type: String,
    description: 'Filter by payment method (e.g., PIX, credit_card, etc.)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by payment status (e.g., APPROVED, PENDING, REJECTED, CANCELED)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments listed',
  })
  @ApiResponse({
    status: 400,
    description: 'Bravive token not configured for this store',
  })
  async listPayments(
    @LoggedUser() user: User,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('method') method?: string,
    @Query('status') status?: string,
  ) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const token = await this.storeService.getBraviveToken(user.storeId);
    if (!token) {
      throw new BadRequestException(
        'Bravive token not configured for this store',
      );
    }

    return this.braviveService.listPayments(token, {
      limit,
      page,
      method,
      status,
    });
  }

  @Get('check-payment/:orderId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually check payment status for an order',
    description:
      'Checks the payment status from Bravive and updates the order if the status has changed. Useful for manual verification when the user clicks "Confirm Payment" button.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    example: 'order-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status checked successfully.',
    schema: {
      example: {
        status: 'APPROVED',
        updated: true,
        order: {
          id: 'order-123',
          orderNumber: 'ABC123',
          orderStatus: 'PROCESSING',
          payment: {
            status: 'PAYMENT_APPROVED',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Payment not found, does not have Bravive ID, or is not a Bravive payment.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  async checkPaymentStatus(
    @Param('orderId') orderId: string,
    @LoggedUser() user: User,
  ) {
    if (!user.storeId) {
      throw new BadRequestException('Store ID not found in user data');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
        storeId: user.storeId,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (!order.payment || !order.payment.braviveId) {
      throw new BadRequestException(
        'Payment not found or does not have Bravive ID',
      );
    }

    if (order.payment.paymentProvider !== 'bravive') {
      throw new BadRequestException(
        'Payment provider is not Bravive. Manual check only available for Bravive payments.',
      );
    }

    const token = await this.storeService.getBraviveToken(user.storeId);
    if (!token) {
      throw new BadRequestException(
        'Bravive token not configured for this store',
      );
    }

    const result = await this.braviveService.checkAndUpdatePaymentStatus(
      order.payment.braviveId,
      token,
    );

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    return {
      status: result.status,
      updated: result.updated,
      order: updatedOrder
        ? {
            ...updatedOrder,
            price: Number(Number(updatedOrder.price).toFixed(2)),
            basePrice: Number(Number(updatedOrder.basePrice).toFixed(2)),
          }
        : null,
    };
  }
}
