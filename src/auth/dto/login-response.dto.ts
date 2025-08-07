import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Access tokens and expiration',
    example: {
      accessToken: '5465d4sa.d5sd6s456a.56ds156das',
      refreshToken: 'refresh-token-example-123',
      expiresIn: 900,
    },
  })
  access: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };

  @ApiProperty({
    description: 'User data',
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    storeId: string;
  };
}
