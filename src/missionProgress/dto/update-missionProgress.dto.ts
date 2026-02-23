import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateMissionProgressDto {
  @ApiPropertyOptional({
    description: 'The current progress of the mission (0-100)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Whether the mission is completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}