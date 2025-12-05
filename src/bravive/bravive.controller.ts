import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoggedUser } from '../auth/logged-user.decorator';
import { User } from '../user/entities/user.entity';
import { StoreService } from '../store/store.service';
import { BraviveService } from './bravive.service';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('bravive')
@Controller('bravive')
export class BraviveController {
  constructor(
    private readonly braviveService: BraviveService,
    private readonly storeService: StoreService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Receive payment webhook from Bravive' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(@Body() webhookDto: WebhookPaymentDto) {
    await this.braviveService.handleWebhook(webhookDto);
    return { message: 'Webhook received' };
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
}
