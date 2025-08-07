import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class TestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email address to send test email to',
    example: 'user@example.com',
  })
  email: string;
}
