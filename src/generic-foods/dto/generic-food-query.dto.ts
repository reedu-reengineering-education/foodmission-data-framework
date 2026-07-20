import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { TransformTrimLowercaseToUndefined } from '../../common/decorators/transformers';

export class GenericFoodQueryDto {
  @ApiPropertyOptional({
    description: 'Search query for food name or synonym',
    example: 'potato',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter by food group. Matches English canonical or translated label when lang is set.',
    example: 'Potatoes and tubers',
  })
  @IsOptional()
  @IsString()
  foodGroup?: string;

  @ApiPropertyOptional({
    description: `Optional locale for translated foodName/foodGroup/remark. Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'nl',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimLowercaseToUndefined()
  lang?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
