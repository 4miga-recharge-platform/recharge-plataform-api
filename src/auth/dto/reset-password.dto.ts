import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  MinLength,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeEmail } from '../../utils/email.util';

export class ResetPasswordDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @IsString()
  @Length(6, 6)
  @ApiProperty({
    description: '6-digit verification code sent to email',
    example: '123456',
  })
  code: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one special character (@$!%*?&)',
  })
  @ApiProperty({
    description: 'New password (minimum 6 characters, must contain uppercase, lowercase and special character)',
    example: 'NewPassword!',
  })
  password: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one special character (@$!%*?&)',
  })
  @ApiProperty({
    description:
      'Password confirmation (must match password; min 6; must contain uppercase, lowercase and special character)',
    example: 'NewPassword!',
  })
  confirmPassword: string;

  @IsString()
  @IsUUID()
  @ApiProperty({
    description: 'store id',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  storeId: string;
}
