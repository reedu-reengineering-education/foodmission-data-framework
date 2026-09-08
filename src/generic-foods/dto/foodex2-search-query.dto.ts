import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { TransformTrimLowercaseToUndefined } from '../../common/decorators/transformers';

export class Foodex2SearchQueryDto {
  @ApiPropertyOptional({
    description:
      'Search term matched case-insensitively against FoodEx2 names, short ' +
      'names and synonyms. Omit to browse the whole vocabulary.',
    example: 'pasta',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Restrict results to the FoodEx2 core list. Off by default so foods ' +
      'EFSA files under an intermediate grouping stay reachable.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  coreOnly?: boolean = false;

  @ApiPropertyOptional({
    description:
      `Locale for FoodEx2 names and for matching translated food names. ` +
      `Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimLowercaseToUndefined()
  lang?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
