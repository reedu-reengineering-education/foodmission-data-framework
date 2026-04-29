import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateFoodProductDto {
  @ApiProperty({
    description: 'The name of the food item',
    example: 'Organic Whole Milk',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

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

  @ApiProperty({
    description: 'Brand name as free text',
    required: false,
    example: 'Organic Valley',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brands?: string;

  @ApiProperty({
    description: 'Product category tags',
    required: false,
    type: [String],
    example: ['dairy', 'milk'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({
    description: 'Product labels',
    required: false,
    type: [String],
    example: ['organic', 'grass-fed'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiProperty({
    description: 'Quantity with unit (e.g. "1 L", "500 g")',
    required: false,
    example: '1 L',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantity?: string;

  @ApiProperty({
    description: 'Serving size with unit',
    required: false,
    example: '250 ml',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  servingSize?: string;

  @ApiProperty({
    description: 'Ingredients text',
    required: false,
    example: 'Milk',
  })
  @IsOptional()
  @IsString()
  ingredientsText?: string;

  @ApiProperty({
    description: 'Allergen tags',
    required: false,
    type: [String],
    example: ['milk'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiProperty({
    description: 'Trace allergen tags',
    required: false,
    type: [String],
    example: ['nuts'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traces?: string[];

  @ApiProperty({
    description: 'Countries where product is sold',
    required: false,
    type: [String],
    example: ['france', 'germany'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @ApiProperty({
    description: 'Ingredient origin',
    required: false,
    example: 'European Union',
  })
  @IsOptional()
  @IsString()
  origins?: string;

  @ApiProperty({
    description: 'Manufacturing places',
    required: false,
    example: 'France',
  })
  @IsOptional()
  @IsString()
  manufacturingPlaces?: string;

  @ApiProperty({
    description: 'Main product image URL',
    required: false,
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({
    description: 'Front-facing image URL',
    required: false,
    example: 'https://example.com/image-front.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageFrontUrl?: string;

  @ApiProperty({
    description: 'Whether product is vegan',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @ApiProperty({
    description: 'Whether product is vegetarian',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @ApiProperty({
    description: 'Whether product is palm-oil free',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPalmOilFree?: boolean;

  @ApiProperty({
    description: 'Raw nutriments payload from source providers',
    required: false,
    type: Object,
    example: { 'energy-kcal_100g': 64, proteins_100g: 3.4 },
  })
  @IsOptional()
  nutrimentsRaw?: Prisma.InputJsonValue;

  @ApiProperty({
    description: 'Nutrient level tags (for example fat/sugar/salt levels)',
    required: false,
    type: Object,
    example: { fat: 'low', sugars: 'medium', salt: 'low' },
  })
  @IsOptional()
  nutrientLevels?: Prisma.InputJsonValue;
}
