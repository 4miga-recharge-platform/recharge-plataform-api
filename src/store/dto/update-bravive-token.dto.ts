import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateBraviveTokenDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Bravive API token',
    example: 'AV_654786478236497832569874329748326497812',
  })
  braviveApiToken: string;
}

