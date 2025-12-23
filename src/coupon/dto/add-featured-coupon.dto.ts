import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddFeaturedCouponDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Coupon ID to add to featured list',
    example: 'uuid-coupon-id',
  })
  couponId: string;
}

