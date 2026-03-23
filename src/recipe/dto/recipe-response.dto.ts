import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Allergens } from '@prisma/client';
import { RecipeIngredientResponseDto } from './recipe-ingredient.dto';

export class RecipeResponseDto {
  @ApiProperty({ description: 'Recipe id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiPropertyOptional({
    description: 'Owner user id (null for system recipes)',
    format: 'uuid',
  })
  @Expose()
  userId?: string;

  @ApiProperty({ description: 'Recipe title' })
  @Expose()
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: 'Instructions' })
  @Expose()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Prep time minutes' })
  @Expose()
  prepTime?: number;

  @ApiPropertyOptional({ description: 'Cook time minutes' })
  @Expose()
  cookTime?: number;

  @ApiPropertyOptional({ description: 'Servings count' })
  @Expose()
  servings?: number;

  @ApiPropertyOptional({ description: 'Difficulty label' })
  @Expose()
  difficulty?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tags' })
  @Expose()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Nutritional info payload' })
  @Expose()
  nutritionalInfo?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Sustainability score' })
  @Expose()
  sustainabilityScore?: number;

  @ApiPropertyOptional({ description: 'Estimated price or cost' })
  @Expose()
  price?: number;

  @ApiPropertyOptional({
    isArray: true,
    enum: Allergens,
    description: 'Allergens',
  })
  @Expose()
  allergens?: Allergens[];

  @ApiProperty({ description: 'Aggregate rating value' })
  @Expose()
  rating: number;

  @ApiProperty({ description: 'Number of ratings' })
  @Expose()
  ratingCount: number;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt: Date;

  // New fields for external recipes
  @ApiPropertyOptional({ description: 'External ID (e.g., TheMealDB idMeal)' })
  @Expose()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Recipe source (themealdb, user, etc.)' })
  @Expose()
  source?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @Expose()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @Expose()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Cuisine type' })
  @Expose()
  cuisineType?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @Expose()
  category?: string;

  @ApiProperty({ description: 'Whether recipe is publicly visible' })
  @Expose()
  isPublic: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Dietary labels' })
  @Expose()
  dietaryLabels?: string[];

  @ApiPropertyOptional({
    type: [RecipeIngredientResponseDto],
    description: 'Recipe ingredients',
  })
  @Expose()
  @Type(() => RecipeIngredientResponseDto)
  ingredients?: RecipeIngredientResponseDto[];
}

export class MultipleRecipeResponseDto {
  @ApiProperty({ type: [RecipeResponseDto] })
  @Expose()
  data: RecipeResponseDto[];

  @ApiProperty({ description: 'Total recipes' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Page' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Limit' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  @Expose()
  totalPages: number;
}
