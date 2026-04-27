import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OpenFoodFactsInfoDto {
  @ApiProperty()
  @Expose()
  barcode!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false, type: [String] })
  @Expose()
  brands?: string[];

  @ApiProperty({ required: false, type: [String] })
  @Expose()
  categories?: string[];

  @ApiProperty({ required: false })
  @Expose()
  ingredients?: string;

  @ApiProperty({ required: false, type: [String] })
  @Expose()
  allergens?: string[];

  @ApiProperty({ required: false })
  @Expose()
  nutritionGrade?: string;

  @ApiProperty({ required: false })
  @Expose()
  novaGroup?: number;

  @ApiProperty({ required: false, type: Object })
  @Expose()
  nutritionalInfo?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @Expose()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @Expose()
  completeness?: number;
}

export class FoodProductResponseDto {
  @ApiProperty({ description: 'The name of the food product' })
  @Expose()
  name!: string;

  @ApiProperty({ required: false })
  @Expose()
  barcode?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  openFoodFactsInfo?: OpenFoodFactsInfoDto;
}

export class PaginatedFoodProductResponseDto {
  @ApiProperty({ type: [FoodProductResponseDto] })
  @Expose()
  data!: FoodProductResponseDto[];

  @ApiProperty()
  @Expose()
  total!: number;

  @ApiProperty()
  @Expose()
  page!: number;

  @ApiProperty()
  @Expose()
  limit!: number;

  @ApiProperty()
  @Expose()
  totalPages!: number;
}
