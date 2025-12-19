import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @Matches(/^\S+\s+\S+/, {
    message: 'Name must contain at least two words (e.g., "João Pedro")',
  })
  @ApiPropertyOptional({
    description: 'Full name of the user (must contain at least two words)',
    example: 'John Doe',
  })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john@example.com',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @ApiPropertyOptional({
    description: 'User phone number',
    example: '5511988887777',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one special character',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @ApiPropertyOptional({
    description:
      'User password (min 6 characters, must contain uppercase, lowercase and special character)',
    example: 'StrongPass!',
  })
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Document value is required' })
  @ApiPropertyOptional({
    description: 'Document value (CPF or CNPJ number)',
    example: '123.456.789-00',
  })
  documentValue?: string;
}
