import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Novo e-mail que substituirá o antigo',
    example: 'novo@email.com',
  })
  newEmail: string;

  @IsString()
  @Length(6, 6)
  @ApiProperty({
    description: 'Código de confirmação enviado para o novo e-mail',
    example: '123456',
  })
  code: string;
}


