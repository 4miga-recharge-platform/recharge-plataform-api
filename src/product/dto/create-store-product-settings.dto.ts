import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateStoreProductSettingsDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store ID',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  storeId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Product ID',
    example: 'b3e1c2d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
  })
  productId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Custom description for the product in this store',
    example: 'Custom product description for our store',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Custom instructions for the product in this store',
    example: 'Custom instructions for using this product',
    required: false,
  })
  instructions?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Custom banner image URL for the product in this store',
    example: 'https://example.com/custom-banner.png',
    required: false,
  })
  imgBannerUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Custom card image URL for the product in this store',
    example: 'https://example.com/custom-card.png',
    required: false,
  })
  imgCardUrl?: string;
}
