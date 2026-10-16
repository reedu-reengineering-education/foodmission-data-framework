import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class StartMissionProgressDto {
  @ApiPropertyOptional({
    description:
      'Numbers the mission asks for on start, by name. Only missions whose ' +
      'rule declares inputs take any (e.g. M.B1.3: previousMeatMeals, last ' +
      "week's meat meals, 0-21); others reject them. Fixed for the attempt: " +
      'starting an already started mission ignores them, and a restart may ' +
      'set new ones. An input left out falls back to what the rule derives ' +
      'from meal logs.',
    example: { previousMeatMeals: 5 },
    type: 'object',
    additionalProperties: { type: 'integer' },
  })
  @IsOptional()
  @IsObject()
  inputs?: Record<string, number>;
}
