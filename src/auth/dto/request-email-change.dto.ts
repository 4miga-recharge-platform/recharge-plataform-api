import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Novo e-mail que receberá o código de confirmação',
    example: 'novo@email.com',
  })
  newEmail: string;
}


