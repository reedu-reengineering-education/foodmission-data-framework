import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NutritionalInfoDto {
  @ApiProperty({
    description: 'Energy content in kilocalories per 100g',
    example: 64,
    required: false,
  })
  @Expose()
  energyKcal?: number;

  @ApiProperty({
    description: 'Energy content in kilojoules per 100g',
    example: 268,
    required: false,
  })
  @Expose()
  energyKj?: number;

  @ApiProperty({
    description: 'Fat content in grams per 100g',
    example: 3.25,
    required: false,
  })
  @Expose()
  fat?: number;

  @ApiProperty({
    description: 'Saturated fat content in grams per 100g',
    example: 1.9,
    required: false,
  })
  @Expose()
  saturatedFat?: number;

  @ApiProperty({
    description: 'Trans fat content in grams per 100g',
    example: 0.1,
    required: false,
  })
  @Expose()
  transFat?: number;

  @ApiProperty({
    description: 'Cholesterol content in milligrams per 100g',
    example: 10,
    required: false,
  })
  @Expose()
  cholesterol?: number;

  @ApiProperty({
    description: 'Carbohydrates content in grams per 100g',
    example: 4.8,
    required: false,
  })
  @Expose()
  carbohydrates?: number;

  @ApiProperty({
    description: 'Sugars content in grams per 100g',
    example: 4.8,
    required: false,
  })
  @Expose()
  sugars?: number;

  @ApiProperty({
    description: 'Fiber content in grams per 100g',
    example: 0,
    required: false,
  })
  @Expose()
  fiber?: number;

  @ApiProperty({
    description: 'Proteins content in grams per 100g',
    example: 3.4,
    required: false,
  })
  @Expose()
  proteins?: number;

  @ApiProperty({
    description: 'Salt content in grams per 100g',
    example: 0.1,
    required: false,
  })
  @Expose()
  salt?: number;

  @ApiProperty({
    description: 'Sodium content in milligrams per 100g',
    example: 44,
    required: false,
  })
  @Expose()
  sodium?: number;

  @ApiProperty({
    description: 'Vitamin A content in micrograms per 100g',
    example: 46,
    required: false,
  })
  @Expose()
  vitaminA?: number;

  @ApiProperty({
    description: 'Vitamin C content in milligrams per 100g',
    example: 0,
    required: false,
  })
  @Expose()
  vitaminC?: number;

  @ApiProperty({
    description: 'Calcium content in milligrams per 100g',
    example: 113,
    required: false,
  })
  @Expose()
  calcium?: number;

  @ApiProperty({
    description: 'Iron content in milligrams per 100g',
    example: 0.03,
    required: false,
  })
  @Expose()
  iron?: number;
}

export class OpenFoodFactsInfoDto {
  @ApiProperty({
    description: 'Product barcode from OpenFoodFacts',
    example: '3017620422003',
    required: false,
  })
  @Expose()
  barcode?: string;

  @ApiProperty({
    description: 'Product name from OpenFoodFacts',
    example: 'Nutella',
    required: false,
  })
  @Expose()
  name?: string;

  @ApiProperty({
    description: 'List of brands associated with the product',
    example: ['Ferrero'],
    type: [String],
    required: false,
  })
  @Expose()
  brands?: string[];

  @ApiProperty({
    description: 'List of categories the product belongs to',
    example: ['Spreads', 'Sweet spreads', 'Cocoa and hazelnuts spreads'],
    type: [String],
    required: false,
  })
  @Expose()
  categories?: string[];

  @ApiProperty({
    description: 'Ingredients list as text',
    example:
      'Sugar, palm oil, hazelnuts, skimmed milk powder, fat-reduced cocoa, lecithin, vanillin',
    required: false,
  })
  @Expose()
  ingredients?: string;

  @ApiProperty({
    description: 'List of allergens present in the product',
    example: ['Milk', 'Nuts'],
    type: [String],
    required: false,
  })
  @Expose()
  allergens?: string[];

  @ApiProperty({
    description: 'Nutri-Score grade (A, B, C, D, E)',
    example: 'D',
    enum: ['A', 'B', 'C', 'D', 'E'],
    required: false,
  })
  @Expose()
  nutritionGrade?: string;

  @ApiProperty({
    description:
      'NOVA group classification (1-4, where 1 is unprocessed and 4 is ultra-processed)',
    example: 4,
    minimum: 1,
    maximum: 4,
    required: false,
  })
  @Expose()
  novaGroup?: number;

  @ApiProperty({
    description: 'Nutritional information from OpenFoodFacts',
    type: () => NutritionalInfoDto,
    required: false,
  })
  @Expose()
  @Type(() => NutritionalInfoDto)
  nutritionalInfo?: NutritionalInfoDto;

  @ApiProperty({
    description: 'URL to product image',
    example:
      'https://static.openfoodfacts.org/images/products/301/762/042/2003/front_fr.4.400.jpg',
    required: false,
  })
  @Expose()
  imageUrl?: string;

  @ApiProperty({
    description: 'Data completeness percentage (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @Expose()
  completeness?: number;
}

export class FoodResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the food item',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Name of the food item',
    example: 'Organic Whole Milk',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Description of the food item',
    example: 'Fresh organic whole milk from grass-fed cows',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Product barcode',
    example: '3017620422003',
    required: false,
  })
  @Expose()
  barcode?: string;

  @ApiProperty({
    description: 'OpenFoodFacts product identifier',
    example: '3017620422003',
    required: false,
  })
  @Expose()
  openFoodFactsId?: string;

  @ApiProperty({
    description: 'Additional information from OpenFoodFacts database',
    type: () => OpenFoodFactsInfoDto,
    required: false,
  })
  @Expose()
  @Type(() => OpenFoodFactsInfoDto)
  openFoodFactsInfo?: OpenFoodFactsInfoDto;

  @ApiProperty({
    description: 'Timestamp when the food item was created',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the food item was last updated',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'UUID of the user who created this food item',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @Expose()
  createdBy: string;
}

export class PaginatedFoodResponseDto {
  @ApiProperty({
    description: 'Array of food items',
    type: [FoodResponseDto],
  })
  @Expose()
  @Type(() => FoodResponseDto)
  data: FoodResponseDto[];

  @ApiProperty({
    description: 'Total number of food items matching the query',
    example: 150,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @Expose()
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  @Expose()
  totalPages: number;
}
