import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min, Max } from 'class-validator';

export class RemoveBannersBatchDto {
  @ApiProperty({
    description: 'Array of banner indices to remove (0-based)',
    example: [0, 2, 4],
    type: [Number],
    minItems: 1,
    maxItems: 5,
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(4, { each: true })
  indices: number[];
}
