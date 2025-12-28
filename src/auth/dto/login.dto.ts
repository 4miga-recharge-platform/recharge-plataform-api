import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { normalizeEmail } from '../../utils/email.util';

export class LoginDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'user email',
    example: 'cliente@exemplo.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'user password',
    example: 'Babebi22*',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: 'store id',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  storeId: string;
}
