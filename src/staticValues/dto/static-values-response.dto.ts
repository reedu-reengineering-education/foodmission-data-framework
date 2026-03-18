import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StaticValueDto } from './static-value.dto';

export class StaticValuesListResponseDto {
  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  data: StaticValueDto[];
}

export class PaginatedStaticValuesListResponseDto {
  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  data: StaticValueDto[];

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

export class StaticValuesStartupDataDto {
  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  genders: StaticValueDto[];

  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  activityLevels: StaticValueDto[];

  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  educationLevels: StaticValueDto[];

  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  annualIncomeLevels: StaticValueDto[];

  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  dietaryPreferences: StaticValueDto[];

  @ApiProperty({ type: [StaticValueDto] })
  @Expose()
  @Type(() => StaticValueDto)
  shoppingResponsibilities: StaticValueDto[];
}

export class StaticValuesStartupResponseDto {
  @ApiProperty({
    description: 'Profile completion dropdown values (small, non-paginated)',
    type: StaticValuesStartupDataDto,
  })
  @Expose()
  @Type(() => StaticValuesStartupDataDto)
  data: StaticValuesStartupDataDto;
}
