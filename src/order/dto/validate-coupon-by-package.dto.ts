import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ValidateCouponByPackageDto {
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
    description: 'Coupon title to validate',
    example: 'WELCOME10',
  })
  couponTitle: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description:
      'User ID for recharge (bigoId) - required for isOneTimePerBigoId coupons',
    example: 'player123456',
    required: false,
  })
  userIdForRecharge?: string;
}
