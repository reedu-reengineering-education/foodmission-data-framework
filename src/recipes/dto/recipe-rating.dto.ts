import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * DTO for rating a recipe (one rating per user per recipe)
 */
export class RateRecipeDto {
  @ApiProperty({
    description: 'Rating value in stars',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  value: number;
}

/**
 * Aggregate rating of a recipe, plus the current user's own rating
 */
export class RecipeRatingResponseDto {
  @ApiProperty({ description: 'Recipe id', format: 'uuid' })
  @Expose()
  recipeId: string;

  @ApiProperty({ description: 'Average rating across all users' })
  @Expose()
  rating: number;

  @ApiProperty({ description: 'Number of ratings' })
  @Expose()
  ratingCount: number;

  @ApiPropertyOptional({
    description: "Current user's own rating, null if not rated yet",
    example: 4,
  })
  @Expose()
  myRating: number | null;
}
