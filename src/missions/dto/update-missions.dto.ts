import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMissionsDto {
  @ApiPropertyOptional({
    description: 'Updated if the mission is available',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  available?: boolean;
}
