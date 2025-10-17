import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store name',
    example: 'Loja Exemplo',
  })
  name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store email',
    example: 'loja@exemplo.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store domain',
    example: 'https://www.4miga.games',
  })
  domain: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'WhatsApp number',
    example: '+5511999999999',
    required: false,
  })
  wppNumber?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Instagram URL',
    example: 'https://instagram.com/lojaexemplo',
    required: false,
  })
  instagramUrl?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Facebook URL',
    example: 'https://facebook.com/lojaexemplo',
    required: false,
  })
  facebookUrl?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'TikTok URL',
    example: 'https://tiktok.com/@lojaexemplo',
    required: false,
  })
  tiktokUrl?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Mini logo URL',
    example: 'https://example.com/mini-logo.png',
    required: false,
  })
  miniLogoUrl?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Favicon URL',
    example: 'https://example.com/favicon.ico',
    required: false,
  })
  faviconUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    description: 'Banner URLs array',
    example: ['https://example.com/banner1.png', 'https://example.com/banner2.png'],
    required: false,
    type: [String],
  })
  bannersUrl?: string[];

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Offer banner image URL',
    example: 'https://example.com/offer-banner.png',
    required: false,
  })
  offerBannerImage?: string;
}
