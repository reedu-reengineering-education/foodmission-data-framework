import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsInt,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { TransformTrimLowercaseToUndefined } from '../../common/decorators/transformers';

export class GenericFoodQueryDto {
  @ApiPropertyOptional({
    description:
      'Search query for food name or synonym. Results are ranked by relevance, ' +
      'and the NEVO variants of a FoodEx2 food the query names collapse into ' +
      'one result.',
    example: 'potato',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Lists the NEVO records behind one search result: pass its foodex2Code. ' +
      'Results are never collapsed when this is set.',
    example: 'A0DPP',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{5}$/, {
    message: 'foodex2Code must be a FoodEx2 term code',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  foodex2Code?: string;

  @ApiPropertyOptional({
    description:
      'Filter by food group (partial match; English canonical or translated when lang is set)',
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
