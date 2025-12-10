import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RechargePrecheckDto {
  @ApiProperty({
    description:
      'bigo_id of the user that need to be recharged (NOT the client_id)',
    example: '52900149',
  })
  @IsString()
  @IsNotEmpty()
  recharge_bigoid: string;
}
