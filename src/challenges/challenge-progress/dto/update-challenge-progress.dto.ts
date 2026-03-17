import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateChallengeProgressDto {
  @ApiPropertyOptional({
    description: 'The current progress of the challenge (0-100)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Whether the challenge is completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}