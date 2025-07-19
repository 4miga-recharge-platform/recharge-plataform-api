import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
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
}
