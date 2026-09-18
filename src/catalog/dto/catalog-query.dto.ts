import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  TransformTrimLowercaseToUndefined,
  TransformTrimToUndefined,
} from '../../common/decorators/transformers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';

const LangQueryProperty = () =>
  applyDecorators(
    ApiPropertyOptional({
      description: `Optional locale override for translated labels. Defaults to ${DEFAULT_LOCALE}.`,
      enum: SUPPORTED_LOCALES,
      example: 'de',
    }),
    IsOptional(),
    IsString(),
    IsIn([...SUPPORTED_LOCALES]),
    TransformTrimLowercaseToUndefined(),
  );

export class CatalogPaginatedQueryDto extends PaginationQueryDto {
  @LangQueryProperty()
  lang?: string;

  @ApiPropertyOptional({
    description: 'Case-insensitive search over label/name',
    example: 'nether',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @TransformTrimToUndefined()
  search?: string;
}

export class CatalogCountryQueryDto {
  @LangQueryProperty()
  lang?: string;

  @ApiPropertyOptional({
    description:
      'ISO 3166-1 alpha-2 country code of the user. Selects the currency of annual income labels (NO shows NOK, PL shows PLN). When omitted, the country implied by lang is used (no -> NO, pl -> PL); otherwise EUR.',
    example: 'NO',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @TransformTrimToUndefined()
  country?: string;
}

export class RegionsQueryDto extends CatalogPaginatedQueryDto {
  @ApiPropertyOptional({
    description:
      'ISO 3166-1 alpha-2 country code (recommended for world-wide regions)',
    example: 'NL',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Type(() => String)
  @TransformTrimToUndefined()
  countryCode?: string;
}
