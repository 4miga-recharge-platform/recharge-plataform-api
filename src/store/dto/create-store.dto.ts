import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store name',
    example: 'Loja Exemplo',
  })
  name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store email',
    example: 'loja@exemplo.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Store password',
    example: 'SenhaForte123',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Confirm password',
    example: 'SenhaForte123',
  })
  confirmPassword: string;
}
