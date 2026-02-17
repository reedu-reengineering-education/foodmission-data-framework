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

  @ApiProperty({ description: 'Name of the food item', example: 'Nutella' })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Description of the food item',
    example: 'Hazelnut And Cocoa Spread',
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

  // --- Product metadata ---

  @ApiProperty({
    description: 'Brands',
    example: 'Ferrero, Nutella',
    required: false,
  })
  @Expose()
  brands?: string;

  @ApiProperty({
    description: 'Category tags',
    example: ['en:spreads', 'en:sweet-spreads'],
    type: [String],
    required: false,
  })
  @Expose()
  categories?: string[];

  @ApiProperty({
    description: 'Label tags (vegetarian, no-gluten, etc.)',
    example: ['en:vegetarian', 'en:no-gluten'],
    type: [String],
    required: false,
  })
  @Expose()
  labels?: string[];

  @ApiProperty({
    description: 'Product quantity',
    example: '400 g',
    required: false,
  })
  @Expose()
  quantity?: string;

  @ApiProperty({
    description: 'Serving size',
    example: '15 g',
    required: false,
  })
  @Expose()
  servingSize?: string;

  @ApiProperty({
    description: 'Ingredients text',
    example:
      'Sugar, palm oil, hazelnuts 13%, low-fat cocoa 7.4%, skimmed milk powder 6.6%',
    required: false,
  })
  @Expose()
  ingredientsText?: string;

  @ApiProperty({
    description: 'Allergens',
    example: ['en:milk', 'en:nuts', 'en:soybeans'],
    type: [String],
    required: false,
  })
  @Expose()
  allergens?: string[];

  @ApiProperty({
    description: 'Trace allergens (possible cross-contamination)',
    type: [String],
    required: false,
  })
  @Expose()
  traces?: string[];

  @ApiProperty({
    description: 'Countries where sold',
    example: ['en:france', 'en:germany'],
    type: [String],
    required: false,
  })
  @Expose()
  countries?: string[];

  @ApiProperty({
    description: 'Where ingredients originate from',
    example: 'European Union',
    required: false,
  })
  @Expose()
  origins?: string;

  @ApiProperty({
    description: 'Where the product is manufactured',
    example: 'France',
    required: false,
  })
  @Expose()
  manufacturingPlaces?: string;

  @ApiProperty({ description: 'Product image URL', required: false })
  @Expose()
  imageUrl?: string;

  @ApiProperty({ description: 'Front product image URL', required: false })
  @Expose()
  imageFrontUrl?: string;

  // --- Nutriments per 100g ---

  @ApiProperty({
    description: 'Whether nutrition data is per 100g or per serving',
    example: '100g',
    required: false,
  })
  @Expose()
  nutritionDataPer?: string;

  @ApiProperty({
    description: 'Energy in kcal per 100g',
    example: 539,
    required: false,
  })
  @Expose()
  energyKcal100g?: number;

  @ApiProperty({
    description: 'Energy in kJ per 100g',
    example: 2252,
    required: false,
  })
  @Expose()
  energyKj100g?: number;

  @ApiProperty({
    description: 'Fat in g per 100g',
    example: 30.9,
    required: false,
  })
  @Expose()
  fat100g?: number;

  @ApiProperty({
    description: 'Saturated fat in g per 100g',
    example: 10.6,
    required: false,
  })
  @Expose()
  saturatedFat100g?: number;

  @ApiProperty({
    description: 'Trans fat in g per 100g',
    required: false,
  })
  @Expose()
  transFat100g?: number;

  @ApiProperty({
    description: 'Cholesterol in mg per 100g',
    required: false,
  })
  @Expose()
  cholesterol100g?: number;

  @ApiProperty({
    description: 'Carbohydrates in g per 100g',
    example: 57.5,
    required: false,
  })
  @Expose()
  carbohydrates100g?: number;

  @ApiProperty({
    description: 'Sugars in g per 100g',
    example: 56.3,
    required: false,
  })
  @Expose()
  sugars100g?: number;

  @ApiProperty({
    description: 'Added sugars in g per 100g',
    required: false,
  })
  @Expose()
  addedSugars100g?: number;

  @ApiProperty({
    description: 'Fiber in g per 100g',
    example: 0,
    required: false,
  })
  @Expose()
  fiber100g?: number;

  @ApiProperty({
    description: 'Proteins in g per 100g',
    example: 6.3,
    required: false,
  })
  @Expose()
  proteins100g?: number;

  @ApiProperty({
    description: 'Salt in g per 100g',
    example: 0.107,
    required: false,
  })
  @Expose()
  salt100g?: number;

  @ApiProperty({
    description: 'Sodium in g per 100g',
    required: false,
  })
  @Expose()
  sodium100g?: number;

  @ApiProperty({ description: 'Vitamin A in µg per 100g', required: false })
  @Expose()
  vitaminA100g?: number;

  @ApiProperty({ description: 'Vitamin C in mg per 100g', required: false })
  @Expose()
  vitaminC100g?: number;

  @ApiProperty({ description: 'Calcium in mg per 100g', required: false })
  @Expose()
  calcium100g?: number;

  @ApiProperty({ description: 'Iron in mg per 100g', required: false })
  @Expose()
  iron100g?: number;

  @ApiProperty({ description: 'Potassium in mg per 100g', required: false })
  @Expose()
  potassium100g?: number;

  @ApiProperty({ description: 'Magnesium in mg per 100g', required: false })
  @Expose()
  magnesium100g?: number;

  @ApiProperty({ description: 'Zinc in mg per 100g', required: false })
  @Expose()
  zinc100g?: number;

  // --- Scores & grades ---

  @ApiProperty({
    description: 'Nutri-Score grade (A-E)',
    example: 'E',
    enum: ['A', 'B', 'C', 'D', 'E'],
    required: false,
  })
  @Expose()
  nutriscoreGrade?: string;

  @ApiProperty({
    description: 'Nutri-Score numeric score',
    required: false,
  })
  @Expose()
  nutriscoreScore?: number;

  @ApiProperty({
    description: 'NOVA group (1=unprocessed, 4=ultra-processed)',
    example: 4,
    minimum: 1,
    maximum: 4,
    required: false,
  })
  @Expose()
  novaGroup?: number;

  @ApiProperty({
    description: 'Eco-Score grade',
    example: 'unknown',
    required: false,
  })
  @Expose()
  ecoscoreGrade?: string;

  @ApiProperty({
    description: 'Carbon footprint from known ingredients (kg CO₂e / kg)',
    required: false,
  })
  @Expose()
  carbonFootprint?: number;

  @ApiProperty({
    description:
      'Nutrient levels traffic light (fat, sugars, salt, saturated-fat)',
    example: {
      fat: 'high',
      sugars: 'high',
      salt: 'low',
      'saturated-fat': 'high',
    },
    required: false,
  })
  @Expose()
  nutrientLevels?: Record<string, string>;

  // --- Diet analysis ---

  @ApiProperty({ description: 'Is the product vegan?', required: false })
  @Expose()
  isVegan?: boolean;

  @ApiProperty({ description: 'Is the product vegetarian?', required: false })
  @Expose()
  isVegetarian?: boolean;

  @ApiProperty({
    description: 'Is the product palm-oil free?',
    required: false,
  })
  @Expose()
  isPalmOilFree?: boolean;

  @ApiProperty({
    description: 'Raw ingredient analysis tags',
    example: ['en:palm-oil', 'en:non-vegan', 'en:vegetarian'],
    type: [String],
    required: false,
  })
  @Expose()
  ingredientsAnalysisTags?: string[];

  // --- Packaging ---

  @ApiProperty({
    description: 'Packaging tags',
    example: ['en:plastic', 'fr:pot-en-verre'],
    type: [String],
    required: false,
  })
  @Expose()
  packagingTags?: string[];

  @ApiProperty({
    description: 'Packaging material tags',
    example: ['en:clear-glass', 'en:pp-5-polypropylene'],
    type: [String],
    required: false,
  })
  @Expose()
  packagingMaterials?: string[];

  @ApiProperty({
    description: 'Packaging recycling tags',
    example: ['en:recycle-in-glass-bin', 'en:recycle-in-sorting-bin'],
    type: [String],
    required: false,
  })
  @Expose()
  packagingRecycling?: string[];

  @ApiProperty({
    description: 'Free-text packaging description',
    required: false,
  })
  @Expose()
  packagingText?: string;

  // --- Data quality ---

  @ApiProperty({
    description: 'Data completeness (0.0 - 1.0)',
    example: 0.875,
    required: false,
  })
  @Expose()
  completeness?: number;

  // --- OpenFoodFacts live data (fetched on demand) ---

  @ApiProperty({
    description: 'Additional information from OpenFoodFacts database',
    type: () => OpenFoodFactsInfoDto,
    required: false,
  })
  @Expose()
  @Type(() => OpenFoodFactsInfoDto)
  openFoodFactsInfo?: OpenFoodFactsInfoDto;

  // --- Timestamps ---

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
