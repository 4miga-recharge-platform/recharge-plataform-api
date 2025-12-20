import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { normalizeEmail } from '../../utils/email.util';

export class CreateInfluencerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Influencer name',
    example: 'João Silva',
  })
  name: string;

  @Transform(({ value }) => {
    if (!value || value.trim() === '') return undefined;
    return normalizeEmail(value);
  })
  @IsString()
  @ValidateIf((o) => o.email && o.email.trim() !== '')
  @IsEmail()
  @IsOptional()
  @ApiProperty({
    description: 'Influencer email',
    example: 'joao@exemplo.com',
    required: false,
  })
  email?: string;

  @IsString()
  @ValidateIf((o) => o.phone && o.phone.trim() !== '')
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ApiProperty({
    description: 'Influencer phone number',
    example: '+5511999999999',
    required: false,
  })
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Payment method',
    example: 'pix',
  })
  paymentMethod: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Payment data (e.g., PIX key, bank account)',
    example: 'PIX_JOAO123',
  })
  paymentData: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Whether the influencer is active',
    example: true,
    required: false,
    default: true,
  })
  isActive?: boolean;
}
