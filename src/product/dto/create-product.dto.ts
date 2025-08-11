import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Product name',
    example: 'Mobile Recharge',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Detailed description of the product',
    example: 'Product for recharging credits on prepaid mobile phones.',
  })
  description: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Instructions for using the product',
    example: 'Enter the phone number and the desired recharge amount.',
  })
  instructions: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @ApiProperty({
    description: 'URL of the product banner image',
    example: 'https://mysite.com/images/product-banner.png',
  })
  imgBannerUrl: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @ApiProperty({
    description: 'URL of the product card image',
    example: 'https://mysite.com/images/product-card.png',
  })
  imgCardUrl: string;
}
