import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateRecipeIngredientDto } from './recipe-ingredient.dto';

export class CreateRecipeDto {
  @ApiProperty({ description: 'Recipe title', example: 'Hearty veggie pasta' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cooking instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Prep time in minutes', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTime?: number;

  @ApiPropertyOptional({ description: 'Cook time in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cookTime?: number;

  @ApiPropertyOptional({ description: 'Servings', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ description: 'Difficulty label', example: 'easy' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({
    description: 'Tags for filtering',
    type: [String],
    example: ['vegan', 'quick'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Structured nutritional info',
    example: { carbs: 50, fats: 10, fiber: 8 },
  })
  @IsOptional()
  @IsObject()
  nutritionalInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sustainability score',
    example: 0.65,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sustainabilityScore?: number;

  @ApiPropertyOptional({
    description: 'Estimated recipe price or cost',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Known allergens',
    type: [String],
    example: ['nuts', 'gluten'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  // New fields for external recipes (TheMealDB integration)
  @ApiPropertyOptional({
    description: 'External identifier (e.g., TheMealDB idMeal)',
    example: '52772',
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({
    description: 'Source of the recipe',
    example: 'themealdb',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Image URL',
    example: 'https://www.themealdb.com/images/media/meals/xxx.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Video URL',
    example: 'https://www.youtube.com/watch?v=xxx',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Cuisine type',
    example: 'Italian',
  })
  @IsOptional()
  @IsString()
  cuisineType?: string;

  @ApiPropertyOptional({
    description: 'Recipe category',
    example: 'Pasta',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Whether recipe is publicly visible',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Dietary labels',
    type: [String],
    example: ['vegan', 'gluten-free'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryLabels?: string[];

  @ApiPropertyOptional({
    description: 'Recipe ingredients',
    type: [CreateRecipeIngredientDto],
    example: [
      { name: 'Chicken Breast', measure: '500g', order: 1 },
      {
        name: 'Olive Oil',
        measure: '2 tbsp',
        order: 2,
        foodCategoryId: 'uuid',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];
}
