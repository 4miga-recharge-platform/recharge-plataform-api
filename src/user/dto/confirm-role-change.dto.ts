import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmRoleChangeDto {
  @ApiProperty({
    description: 'Admin password to confirm the role change action',
    example: 'mySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}









