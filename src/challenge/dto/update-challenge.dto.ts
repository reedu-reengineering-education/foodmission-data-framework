import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateChallengeDto {
  @ApiPropertyOptional({
    description: 'Updated if the challenge is available',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  available?: boolean;
}
