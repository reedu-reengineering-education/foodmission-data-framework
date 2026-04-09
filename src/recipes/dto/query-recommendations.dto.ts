import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryRecommendationsDto {
  @ApiPropertyOptional({
    description: 'Include items expiring within this many days',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  expiringWithinDays?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of recommendations',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination (number of items to skip)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
