import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'User phone number', example: '5511988887777' })
  phone: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  @ApiProperty({
    description: 'User password (min 6 characters)',
    example: 'strongPassword123',
  })
  password: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Password confirmation (must match password)',
    example: 'strongPassword123',
  })
  confirmPassword: string;

  @IsEnum(['cpf', 'cnpj'])
  @ApiProperty({
    description: 'Document type: cpf or cnpj',
    enum: ['cpf', 'cnpj'],
    example: 'cpf',
  })
  documentType: 'cpf' | 'cnpj';

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Document value (CPF or CNPJ number)',
    example: '123.456.789-00',
  })
  documentValue: string;

  @IsEnum(['MASTER_ADMIN', 'ADMIN', 'USER'])
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User role',
    enum: ['MASTER_ADMIN', 'ADMIN', 'USER'],
    example: 'USER',
  })
  role?: 'MASTER_ADMIN' | 'ADMIN' | 'USER';

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Store ID (UUID)', example: 'store-uuid' })
  storeId: string;
}
