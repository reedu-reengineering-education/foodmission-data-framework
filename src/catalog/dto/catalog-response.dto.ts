import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CatalogValueDto } from './catalog-value.dto';

export class CatalogListResponseDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  data: CatalogValueDto[];
}

export class PaginatedCatalogListResponseDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  data: CatalogValueDto[];

  @ApiProperty({ description: 'Total items' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Page number' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Items per page' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  @Expose()
  totalPages: number;
}

export class CatalogStartupDataDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  genders: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  activityLevels: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  educationLevels: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  annualIncomeLevels: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  dietaryPreferences: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  shoppingResponsibilities: CatalogValueDto[];
}

export class CatalogStartupResponseDto {
  @ApiProperty({
    description: 'Profile completion dropdown values (small, non-paginated)',
    type: CatalogStartupDataDto,
  })
  @Expose()
  @Type(() => CatalogStartupDataDto)
  data: CatalogStartupDataDto;
}
