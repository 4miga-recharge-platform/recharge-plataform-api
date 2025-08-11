import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'SenhaAtual123',
  })
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({
    description: 'Nova senha (mínimo 6 caracteres)',
    example: 'NovaSenha123',
  })
  newPassword: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)',
  })
  @ApiProperty({
    description:
      'Confirmação da nova senha (mín. 8 caracteres, deve conter maiúscula, minúscula, número e caractere especial)',
    example: 'NovaSenha123!',
  })
  confirmPassword: string;
}


