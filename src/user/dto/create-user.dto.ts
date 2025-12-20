import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { normalizeEmail } from '../../utils/email.util';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @Matches(/^\S+\s+\S+/, {
    message: 'Name must contain at least two words (e.g., "João Pedro")',
  })
  @ApiProperty({
    description: 'Full name of the user (must contain at least two words)',
    example: 'John Doe',
  })
  name: string;

  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @ApiProperty({ description: 'User phone number', example: '5511988887777' })
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one special character',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @ApiProperty({
    description:
      'User password (min 6 characters, must contain uppercase, lowercase and special character)',
    example: 'StrongPass!',
  })
  password: string;

  @IsEnum(['cpf', 'cnpj'], { message: 'Document type must be cpf or cnpj' })
  @ApiProperty({
    description: 'Document type: cpf or cnpj',
    enum: ['cpf', 'cnpj'],
    example: 'cpf',
  })
  documentType: 'cpf' | 'cnpj';

  @IsString()
  @IsNotEmpty({ message: 'Document value is required' })
  @ApiProperty({
    description: 'Document value (CPF or CNPJ number)',
    example: '123.456.789-00',
  })
  documentValue: string;

  @IsString()
  @IsNotEmpty({ message: 'Store ID is required' })
  @ApiProperty({ description: 'Store ID (UUID)', example: 'store-uuid' })
  storeId: string;
}
