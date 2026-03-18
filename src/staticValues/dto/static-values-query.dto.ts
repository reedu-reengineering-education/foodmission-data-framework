import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TransformTrimToUndefined } from '../../common/decorators/transformers';

export class StaticValuesPaginatedQueryDto extends PaginationQueryDto {
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

export class RegionsQueryDto extends StaticValuesPaginatedQueryDto {
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
