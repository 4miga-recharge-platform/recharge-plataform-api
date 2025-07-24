import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResendEmailConfirmationDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'User email address to resend the confirmation code',
    example: 'user@example.com',
  })
  email: string;
}
