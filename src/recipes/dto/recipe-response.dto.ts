import { EnvironmentalImpact } from '../nutrition/calculate-recipe-impact';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Allergens, RecipeOrigin } from '@prisma/client';
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

  @ApiPropertyOptional({
    description:
      'Estimated from the ingredients: { per100g: { energyKcal, proteins, … }, estimated: true, missingIngredients: [names] }. ' +
      'Entered by the user: the object they sent, plus estimated: false. Null when nothing is known',
    example: {
      per100g: { energyKcal: 154.8, proteins: 5.4, fat: 0.9 },
      estimated: true,
      missingIngredients: [],
    },
  })
  @Expose()
  nutritionalInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Environmental impact from AGRIBALYSE (ADEME) values of the linked foods: CO2 in kg CO2 eq and the EF single score in mPt, per kg of the dish. coverage is the share of ingredient weight with AGRIBALYSE data, dqr the weighted data quality (1 best, 5 worst). Null when less than 95% of the ingredient weight has data or an ingredient cannot be weighed',
    nullable: true,
    example: {
      perKg: { co2: 2.416, efScoreMpt: 0.301 },
      coverage: 1,
      dqr: 2.92,
      source: 'AGRIBALYSE 3.2',
    },
  })
  @Expose()
  environmentalImpact?: EnvironmentalImpact | null;

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

  @ApiProperty({
    description: 'Where the recipe came from',
    enum: RecipeOrigin,
  })
  @Expose()
  origin: RecipeOrigin;

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
