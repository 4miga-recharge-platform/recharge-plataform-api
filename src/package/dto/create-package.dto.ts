import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  @IsString()
  @ApiProperty({
    description: 'Payment method name',
    enum: ['pix', 'mercado_pago', 'picpay', 'paypal', 'boleto', 'transferencia'],
    example: 'pix',
  })
  name: 'pix' | 'mercado_pago' | 'picpay' | 'paypal' | 'boleto' | 'transferencia';

  @IsNumber()
  @ApiProperty({
    description: 'Price for this payment method',
    example: 19.99,
  })
  price: number;
}

export class CreatePackageDto {
  @IsString()
  @ApiProperty({
    description: 'Name of the package',
    example: 'Premium Package',
  })
  name: string;

  @IsNumber()
  @ApiProperty({
    description: 'Amount of credits in the package',
    example: 100,
  })
  amountCredits: number;

  @IsString()
  @ApiProperty({
    description: 'URL of the package card image',
    example: 'https://example.com/package-card.png',
  })
  imgCardUrl: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Whether this package is active',
    example: true,
    required: false,
  })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Whether this package is an offer',
    example: false,
    required: false,
  })
  isOffer?: boolean;

  @IsNumber()
  @ApiProperty({
    description: 'Base price of the package',
    example: 19.99,
  })
  basePrice: number;

  @IsUUID()
  @ApiProperty({
    description: 'ID of the product this package belongs to',
    example: 'b3e1c2d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
  })
  productId: string;

  @IsUUID()
  @ApiProperty({
    description: 'ID of the store this package belongs to',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  storeId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  @ApiProperty({
    description: 'Payment methods for this package',
    type: [PaymentMethodDto],
    required: false,
  })
  paymentMethods?: PaymentMethodDto[];
}
