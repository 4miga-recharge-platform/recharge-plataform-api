import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  name: string;

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
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @ApiProperty({
    description: 'User password (min 8 characters, must contain uppercase, lowercase, number and special character)',
    example: 'StrongPass123!',
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

  @IsEnum(['MASTER_ADMIN', 'ADMIN', 'USER'], { message: 'Role must be MASTER_ADMIN, ADMIN or USER' })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User role',
    enum: ['MASTER_ADMIN', 'ADMIN', 'USER'],
    example: 'USER',
  })
  role?: 'MASTER_ADMIN' | 'ADMIN' | 'USER';

  @IsString()
  @IsNotEmpty({ message: 'Store ID is required' })
  @ApiProperty({ description: 'Store ID (UUID)', example: 'store-uuid' })
  storeId: string;
}
