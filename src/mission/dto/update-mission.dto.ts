import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMissionDto {
@ApiPropertyOptional({
    description: 'Updated if the mission is available',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  available?: boolean;

}
