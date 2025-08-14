import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  storeId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Package ID',
    example: '7c0e8400-e29b-41d4-a716-446655440123',
  })
  packageId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Payment Method ID (from package payment methods)',
    example: '9a0e8400-e29b-41d4-a716-446655440789',
  })
  paymentMethodId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'User ID for recharge',
    example: 'player123456',
  })
  userIdForRecharge: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Coupon title for discount (optional)',
    example: 'WELCOME10',
    required: false,
  })
  couponTitle?: string;
}
