import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateBigoIdDto {
  @IsOptional()
  @IsString({ message: 'rechargeBigoId must be a string or null' })
  @ApiProperty({
    description: 'Bigo ID (can be null to clear the value)',
    example: '1234567890',
    required: false,
    nullable: true,
  })
  rechargeBigoId?: string | null;
}
