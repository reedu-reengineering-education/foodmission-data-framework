import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BREAKDOWN_KEYS } from './breakdowns';

export const DEFAULT_WEEKS = 12;
export const MAX_WEEKS = 104;

/** Query parameters shared by every admin insight route. */
export class InsightQueryDto {
  @ApiPropertyOptional({
    enum: BREAKDOWN_KEYS,
    description: 'Split rows by a user property.',
  })
  @IsOptional()
  @IsString()
  breakdown?: string;

  @ApiPropertyOptional({
    enum: BREAKDOWN_KEYS,
    description: 'Second user property (requires breakdown; not region).',
  })
  @IsOptional()
  @IsString()
  breakdown2?: string;

  @ApiPropertyOptional({
    description:
      'Rollup level; allowed values per insight are listed in the catalog.',
  })
  @IsOptional()
  @IsString()
  by?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: MAX_WEEKS,
    default: DEFAULT_WEEKS,
    description: 'Time series only: number of ISO weeks, current week last.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WEEKS)
  weeks?: number;
}
