import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TransformTrimToUndefined } from '../../common/decorators/transformers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';

export class CatalogPaginatedQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: `Optional locale override for translated labels. Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimToUndefined()
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
