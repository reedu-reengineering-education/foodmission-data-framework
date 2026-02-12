import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMissionDto {
  @ApiPropertyOptional({
    description: 'The quantity of the item',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Updated if the mission is available',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Updated if the mission is completed',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  completed?: boolean;
}
