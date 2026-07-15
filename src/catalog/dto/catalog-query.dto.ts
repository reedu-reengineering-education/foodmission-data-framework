import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TransformTrimToUndefined } from '../../common/decorators/transformers';
import { LangQueryDto } from '../../i18n/dto/lang-query.dto';

export class CatalogPaginatedQueryDto extends IntersectionType(
  PaginationQueryDto,
  LangQueryDto,
) {
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
