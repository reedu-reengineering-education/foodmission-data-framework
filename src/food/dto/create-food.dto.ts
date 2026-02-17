import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFoodDto {
  @ApiProperty({
    description: 'The name of the food item',
    example: 'Organic Whole Milk',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Detailed description of the food item',
    example: 'Fresh organic whole milk from grass-fed cows',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Product barcode (EAN, UPC, etc.)',
    example: '3017620422003',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  // --- Product metadata ---

  @ApiProperty({ description: 'Brands', required: false })
  @IsOptional()
  @IsString()
  brands?: string;

  @ApiProperty({
    description: 'Category tags',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  categories?: string[];

  @ApiProperty({
    description: 'Label tags',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  labels?: string[];

  @ApiProperty({ description: 'Product quantity', required: false })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiProperty({ description: 'Serving size', required: false })
  @IsOptional()
  @IsString()
  servingSize?: string;

  @ApiProperty({ description: 'Ingredients text', required: false })
  @IsOptional()
  @IsString()
  ingredientsText?: string;

  @ApiProperty({
    description: 'Allergen tags',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  allergens?: string[];

  @ApiProperty({
    description: 'Trace allergen tags',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  traces?: string[];

  @ApiProperty({
    description: 'Countries where sold',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  countries?: string[];

  @ApiProperty({
    description: 'Where ingredients originate from',
    example: 'European Union',
    required: false,
  })
  @IsOptional()
  @IsString()
  origins?: string;

  @ApiProperty({
    description: 'Where the product is manufactured',
    example: 'France',
    required: false,
  })
  @IsOptional()
  @IsString()
  manufacturingPlaces?: string;

  @ApiProperty({ description: 'Product image URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Front product image URL', required: false })
  @IsOptional()
  @IsString()
  imageFrontUrl?: string;

  // --- Nutriments per 100g ---

  @ApiProperty({
    description: 'Whether nutrition data is per 100g or per serving',
    example: '100g',
    required: false,
  })
  @IsOptional()
  @IsString()
  nutritionDataPer?: string;

  @ApiProperty({ description: 'Energy in kcal per 100g', required: false })
  @IsOptional()
  @IsNumber()
  energyKcal?: number;

  @ApiProperty({ description: 'Energy in kJ per 100g', required: false })
  @IsOptional()
  @IsNumber()
  energyKj?: number;

  @ApiProperty({ description: 'Fat in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  fat?: number;

  @ApiProperty({ description: 'Saturated fat in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  saturatedFat?: number;

  @ApiProperty({ description: 'Trans fat in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  transFat?: number;

  @ApiProperty({ description: 'Cholesterol in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  cholesterol?: number;

  @ApiProperty({
    description: 'Carbohydrates in g per 100g',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  carbohydrates?: number;

  @ApiProperty({ description: 'Sugars in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  sugars?: number;

  @ApiProperty({ description: 'Added sugars in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  addedSugars?: number;

  @ApiProperty({ description: 'Fiber in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  fiber?: number;

  @ApiProperty({ description: 'Proteins in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  proteins?: number;

  @ApiProperty({ description: 'Salt in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  salt?: number;

  @ApiProperty({ description: 'Sodium in g per 100g', required: false })
  @IsOptional()
  @IsNumber()
  sodium?: number;

  @ApiProperty({ description: 'Vitamin A in µg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  vitaminA?: number;

  @ApiProperty({ description: 'Vitamin C in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  vitaminC?: number;

  @ApiProperty({ description: 'Calcium in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  calcium?: number;

  @ApiProperty({ description: 'Iron in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  iron?: number;

  @ApiProperty({ description: 'Potassium in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  potassium?: number;

  @ApiProperty({ description: 'Magnesium in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  magnesium?: number;

  @ApiProperty({ description: 'Zinc in mg per 100g', required: false })
  @IsOptional()
  @IsNumber()
  zinc?: number;

  // --- Scores ---

  @ApiProperty({
    description: 'Nutri-Score grade',
    enum: ['A', 'B', 'C', 'D', 'E'],
    required: false,
  })
  @IsOptional()
  @IsString()
  nutriscoreGrade?: string;

  @ApiProperty({ description: 'Nutri-Score numeric score', required: false })
  @IsOptional()
  @IsInt()
  nutriscoreScore?: number;

  @ApiProperty({
    description: 'NOVA group (1=unprocessed, 4=ultra-processed)',
    minimum: 1,
    maximum: 4,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  novaGroup?: number;

  @ApiProperty({ description: 'Eco-Score grade', required: false })
  @IsOptional()
  @IsString()
  ecoscoreGrade?: string;

  @ApiProperty({
    description: 'Carbon footprint from known ingredients (kg CO₂e / kg)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  carbonFootprint?: number;

  // --- Diet analysis ---

  @ApiProperty({ description: 'Is the product vegan?', required: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiProperty({ description: 'Is the product vegetarian?', required: false })
  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @ApiProperty({
    description: 'Is the product palm-oil free?',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPalmOilFree?: boolean;
}
