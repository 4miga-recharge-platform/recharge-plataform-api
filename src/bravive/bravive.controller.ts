import {
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BraviveService } from './bravive.service';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('bravive')
@Controller('bravive')
export class BraviveController {
  constructor(private readonly braviveService: BraviveService) {}

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
  @ApiOperation({ summary: 'Create a new payment in Bravive (for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Authorization not provided',
  })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    // TODO: Get token from logged user's store
    // Temporarily using token from .env
    const token = process.env.BRAVIVE_API_TOKEN;
    if (!token) {
      throw new Error('BRAVIVE_API_TOKEN not configured');
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
  async getPayment(@Param('id') id: string) {
    // TODO: Get token from logged user's store
    // Temporarily using token from .env
    const token = process.env.BRAVIVE_API_TOKEN;
    if (!token) {
      throw new Error('BRAVIVE_API_TOKEN not configured');
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
  async listPayments(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('method') method?: string,
    @Query('status') status?: string,
  ) {
    // TODO: Get token from logged user's store
    // Temporarily using token from .env
    const token = process.env.BRAVIVE_API_TOKEN;
    if (!token) {
      throw new Error('BRAVIVE_API_TOKEN not configured');
    }
    return this.braviveService.listPayments(token, {
      limit,
      page,
      method,
      status,
    });
  }
}
