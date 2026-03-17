import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateChallengesDto {
  @ApiPropertyOptional({
    description: 'Updated if the challenge is available',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  available?: boolean;
}
