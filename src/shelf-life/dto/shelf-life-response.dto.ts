import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ShelfLifeResponseDto {
  @ApiProperty({ description: 'Unique ID', example: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'FoodKeeper product ID', example: 1 })
  @Expose()
  foodKeeperProductId: number;

  @ApiProperty({ description: 'Product name', example: 'Milk, whole' })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Search keywords',
    example: ['milk', 'whole milk', 'dairy'],
  })
  @Expose()
  keywords: string[];

  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Dairy Products & Eggs',
  })
  @Expose()
  categoryName: string | null;

  @ApiPropertyOptional({
    description: 'Default storage type',
    example: 'refrigerator',
    enum: ['pantry', 'refrigerator', 'freezer'],
  })
  @Expose()
  defaultStorageType: string | null;

  @ApiPropertyOptional({ description: 'Minimum days in pantry', example: null })
  @Expose()
  pantryMinDays: number | null;

  @ApiPropertyOptional({ description: 'Maximum days in pantry', example: null })
  @Expose()
  pantryMaxDays: number | null;

  @ApiPropertyOptional({
    description: 'Minimum days in refrigerator',
    example: 5,
  })
  @Expose()
  refrigeratorMinDays: number | null;

  @ApiPropertyOptional({
    description: 'Maximum days in refrigerator',
    example: 7,
  })
  @Expose()
  refrigeratorMaxDays: number | null;

  @ApiPropertyOptional({
    description: 'Days after opening (refrigerated)',
    example: 5,
  })
  @Expose()
  refrigeratorAfterOpeningDays: number | null;

  @ApiPropertyOptional({ description: 'Minimum days in freezer', example: 90 })
  @Expose()
  freezerMinDays: number | null;

  @ApiPropertyOptional({ description: 'Maximum days in freezer', example: 180 })
  @Expose()
  freezerMaxDays: number | null;
}

export class MultipleFoodShelfLifeResponseDto {
  @ApiProperty({ type: [ShelfLifeResponseDto] })
  @Expose()
  @Type(() => ShelfLifeResponseDto)
  data: ShelfLifeResponseDto[];

  @ApiProperty({ description: 'Total count', example: 95 })
  @Expose()
  total: number;
}

export class ExpiryCalculationResponseDto {
  @ApiPropertyOptional({
    description: 'Calculated expiry date',
    example: '2026-04-06T00:00:00Z',
  })
  @Expose()
  expiryDate: Date | null;

  @ApiProperty({
    description: 'Source of calculation',
    example: 'auto_foodkeeper',
    enum: ['manual', 'auto_foodkeeper', 'none'],
  })
  @Expose()
  source: string;

  @ApiPropertyOptional({ description: 'Shelf life in days', example: 7 })
  @Expose()
  shelfLifeDays: number | null;

  @ApiPropertyOptional({
    description: 'Inferred storage type',
    example: 'refrigerator',
    enum: ['pantry', 'refrigerator', 'freezer'],
  })
  @Expose()
  storageType: string | null;
}
