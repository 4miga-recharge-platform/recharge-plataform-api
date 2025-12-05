import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  name?: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john@example.com',
  })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @ApiPropertyOptional({
    description: 'User phone number',
    example: '5511988887777',
  })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @ApiPropertyOptional({
    description:
      'User password (min 8 characters, must contain uppercase, lowercase, number and special character)',
    example: 'StrongPass123!',
  })
  password?: string;

  @IsString()
  @IsNotEmpty({ message: 'Document value is required' })
  @ApiPropertyOptional({
    description: 'Document value (CPF or CNPJ number)',
    example: '123.456.789-00',
  })
  documentValue?: string;
}
