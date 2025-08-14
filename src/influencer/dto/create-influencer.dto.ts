import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateInfluencerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Influencer name',
    example: 'João Silva',
  })
  name: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  @ApiProperty({
    description: 'Influencer email',
    example: 'joao@exemplo.com',
    required: false,
  })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Influencer phone number',
    example: '+5511999999999',
    required: false,
  })
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Payment method',
    example: 'pix',
    required: false,
  })
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Payment data (e.g., PIX key, bank account)',
    example: 'PIX_JOAO123',
    required: false,
  })
  paymentData?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Whether the influencer is active',
    example: true,
    required: false,
    default: true,
  })
  isActive?: boolean;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store ID where the influencer belongs',
    example: 'uuid-store-id',
  })
  storeId: string;
}
