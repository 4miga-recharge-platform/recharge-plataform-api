import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizeEmail } from '../../utils/email.util';

export class RequestEmailChangeDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Novo e-mail que receberá o código de confirmação',
    example: 'novo@email.com',
  })
  newEmail: string;
}
