import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CatalogValueDto } from './catalog-value.dto';

export class CatalogListResponseDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  data!: CatalogValueDto[];
}

export class PaginatedCatalogListResponseDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  data!: CatalogValueDto[];

  @ApiProperty({ description: 'Total items' })
  @Expose()
  total!: number;

  @ApiProperty({ description: 'Page number' })
  @Expose()
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  @Expose()
  limit!: number;

  @ApiProperty({ description: 'Total pages' })
  @Expose()
  totalPages!: number;
}

/** Dropdown values for gamification onboarding baselines and related prefs. */
export class CatalogOnboardingStartupDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  weeklyMeatRanges!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  weeklyBeefFrequencies!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  weeklyFoodWasteRanges!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  weeklyUpfRanges!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  weeklyReusableRanges!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  userSegments!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  motivations!: CatalogValueDto[];
}

export class CatalogStartupDataDto {
  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  genders!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  activityLevels!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  educationLevels!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  annualIncomeLevels!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  dietaryPreferences!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  shoppingResponsibilities!: CatalogValueDto[];

  @ApiProperty({
    description: 'Gamification onboarding baseline catalogs',
    type: CatalogOnboardingStartupDto,
  })
  @Expose()
  @Type(() => CatalogOnboardingStartupDto)
  onboarding!: CatalogOnboardingStartupDto;

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  progressIndicatorKinds!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  progressPrecisions!: CatalogValueDto[];

  @ApiProperty({ type: [CatalogValueDto] })
  @Expose()
  @Type(() => CatalogValueDto)
  walletCurrencies!: CatalogValueDto[];
}

export class CatalogStartupResponseDto {
  @ApiProperty({
    description:
      'Static values for app startup (profile + nested onboarding baselines)',
    type: CatalogStartupDataDto,
  })
  @Expose()
  @Type(() => CatalogStartupDataDto)
  data!: CatalogStartupDataDto;
}
