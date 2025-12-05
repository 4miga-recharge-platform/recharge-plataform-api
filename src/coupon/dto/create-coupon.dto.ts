import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Coupon title',
    example: 'WELCOME10',
  })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Influencer ID',
    example: 'uuid-influencer-id',
  })
  influencerId: string;

  @ValidateIf(
    (o) => o.discountPercentage !== null && o.discountPercentage !== undefined,
  )
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @ApiProperty({
    description: 'Discount percentage (0-100)',
    example: 10.0,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  discountPercentage?: number | null;

  @ValidateIf(
    (o) => o.discountAmount !== null && o.discountAmount !== undefined,
  )
  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiProperty({
    description: 'Discount amount in currency',
    example: 5.0,
    required: false,
    minimum: 0,
  })
  discountAmount?: number | null;

  @ValidateIf((o) => o.expiresAt && o.expiresAt.trim() !== '')
  @IsDateString()
  @IsOptional()
  @ApiProperty({
    description: 'Expiration date',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  expiresAt?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiProperty({
    description: 'Maximum number of uses',
    example: 100,
    required: false,
    minimum: 0,
  })
  maxUses?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiProperty({
    description: 'Minimum order amount required',
    example: 20.0,
    required: false,
    minimum: 0,
  })
  minOrderAmount?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Whether the coupon is active',
    example: true,
    required: false,
    default: true,
  })
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Whether this is a first purchase coupon',
    example: false,
    required: false,
    default: false,
  })
  isFirstPurchase?: boolean;
}
