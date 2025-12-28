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
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one special character (@$!%*?&)',
  })
  @ApiProperty({
    description: 'Nova senha (mínimo 6 caracteres, deve conter maiúscula, minúscula e caractere especial)',
    example: 'NovaSenha!',
  })
  newPassword: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one special character (@$!%*?&)',
  })
  @ApiProperty({
    description:
      'Confirmação da nova senha (mín. 6 caracteres, deve conter maiúscula, minúscula e caractere especial)',
    example: 'NovaSenha!',
  })
  confirmPassword: string;
}
