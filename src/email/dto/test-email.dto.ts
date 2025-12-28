import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { normalizeEmail } from '../../utils/email.util';

export class TestEmailDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email address to send test email to',
    example: 'user@example.com',
  })
  email: string;
}
