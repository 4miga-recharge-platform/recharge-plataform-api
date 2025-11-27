import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class RechargePrecheckDto {
  @ApiProperty({
    description: 'bigo_id of the user that need to be recharged (NOT the client_id)',
    example: '52900149',
  })
  @IsString()
  @IsNotEmpty()
  recharge_bigoid: string;

  @ApiProperty({
    description: 'Request serial number, should be unique, easier to track request. Only contain numbers and lowercase letters. The length must be between 13 and 32',
    example: '83jyhm2784089j',
  })
  @IsString()
  @IsNotEmpty()
  @Length(13, 32)
  @Matches(/^[a-z0-9]+$/, {
    message: 'seqid must contain only lowercase letters and numbers',
  })
  seqid: string;
}
