import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateStoreProductSettingsDto {
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
