import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum WebhookStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
  CHARGEBACK = 'CHARGEBACK',
  REFUNDED = 'REFUNDED',
  IN_DISPUTE = 'IN_DISPUTE',
}

class PayerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  document: string;
}

class PaymentMethodDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsObject()
  details: Record<string, any>;
}

export class WebhookPaymentDto {
  @ApiProperty({
    description: 'Payment ID from Bravive',
    example: 'abc123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Event type',
    example: 'PAYMENT',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Payment status',
    enum: WebhookStatus,
    example: WebhookStatus.APPROVED,
  })
  @IsEnum(WebhookStatus)
  status: WebhookStatus;

  @ApiProperty({
    description: 'Payment amount in cents',
    example: 10000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'BRL',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'External ID (custom ID provided when creating payment)',
    example: 'order-123',
    required: false,
  })
  @IsString()
  external_id?: string;

  @ApiProperty({
    description: 'Payment creation date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsString()
  created_at: string;

  @ApiProperty({
    description: 'Payment update date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsString()
  updated_at: string;

  @ApiProperty({
    description: 'Payer information',
    type: PayerDto,
  })
  @ValidateNested()
  @Type(() => PayerDto)
  payer: PayerDto;

  @ApiProperty({
    description: 'Payment method information',
    type: PaymentMethodDto,
  })
  @ValidateNested()
  @Type(() => PaymentMethodDto)
  payment_method: PaymentMethodDto;
}

