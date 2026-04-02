import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { RecipeResponseDto } from './recipe-response.dto';

export class MatchedIngredientDto {
  @ApiProperty({
    description: 'Recipe ingredient name',
    example: 'Chicken Breast',
  })
  @Expose()
  ingredientName: string;

  @ApiProperty({ description: 'Pantry item name', example: 'Chicken Breast' })
  @Expose()
  pantryItemName: string;

  @ApiProperty({ description: 'Is this item expiring soon', example: true })
  @Expose()
  isExpiringSoon: boolean;

  @ApiPropertyOptional({ description: 'Days until expiry', example: 3 })
  @Expose()
  daysUntilExpiry: number | null;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Recipe ID', example: 'uuid-recipe-id' })
  @Expose()
  recipeId: string;

  @ApiProperty({ description: 'Recipe details', type: () => RecipeResponseDto })
  @Expose()
  @Type(() => RecipeResponseDto)
  recipe: RecipeResponseDto;

  @ApiProperty({ description: 'Number of matched ingredients', example: 6 })
  @Expose()
  matchCount: number;

  @ApiProperty({ description: 'Total ingredients in recipe', example: 8 })
  @Expose()
  totalIngredients: number;

  @ApiProperty({ description: 'Number of expiring items matched', example: 2 })
  @Expose()
  expiringMatchCount: number;

  @ApiProperty({
    description: 'Matched ingredients details',
    type: [MatchedIngredientDto],
  })
  @Expose()
  @Type(() => MatchedIngredientDto)
  matchedIngredients: MatchedIngredientDto[];
}

export class MultipleRecommendationResponseDto {
  @ApiProperty({
    description: 'Recipe recommendations',
    type: [RecommendationResponseDto],
  })
  @Expose()
  @Type(() => RecommendationResponseDto)
  data: RecommendationResponseDto[];

  @ApiProperty({ description: 'Number of items expiring soon', example: 5 })
  @Expose()
  expiringItemsCount: number;

  @ApiProperty({ description: 'Total pantry items', example: 15 })
  @Expose()
  totalPantryItems: number;
}
