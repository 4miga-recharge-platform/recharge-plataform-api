import { ApiProperty } from '@nestjs/swagger';

export class CouponValidationResponseDto {
  @ApiProperty({
    description: 'Whether the coupon is valid',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Validation message (if invalid)',
    example: 'Coupon has expired',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Discount amount that would be applied',
    example: 5.0,
    required: false,
  })
  discountAmount?: number;

  @ApiProperty({
    description: 'Final amount after discount',
    example: 45.0,
    required: false,
  })
  finalAmount?: number;

  @ApiProperty({
    description: 'Coupon details',
    example: {
      id: 'coupon-123',
      title: 'WELCOME10',
      discountPercentage: 10.0,
      discountAmount: null,
      isFirstPurchase: false,
    },
    required: false,
  })
  coupon?: any;
}
