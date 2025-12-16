import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum PaymentMethod {
  PIX = 'PIX',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount in cents',
    example: 10000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'BRL',
    default: 'BRL',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Recarga de moedas Bigo Live',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Payer name',
    example: 'João Silva',
  })
  @IsString()
  payer_name: string;

  @ApiProperty({
    description: 'Payer email',
    example: 'joao@example.com',
  })
  @IsEmail()
  payer_email: string;

  @ApiProperty({
    description: 'Payer phone',
    example: '5511999999999',
  })
  @IsString()
  payer_phone: string;

  @ApiProperty({
    description: 'Payer document (CPF/CNPJ)',
    example: '12345678900',
  })
  @IsString()
  payer_document: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
