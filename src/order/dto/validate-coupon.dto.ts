import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Coupon title to validate',
    example: 'WELCOME10',
  })
  couponTitle: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    description: 'Order amount to validate against coupon',
    example: 50.00,
    minimum: 0,
  })
  orderAmount: number;
}
