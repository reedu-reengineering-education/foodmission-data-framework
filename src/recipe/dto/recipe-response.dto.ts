import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DishResponseDto } from '../../dish/dto/dish-response.dto';

export class RecipeResponseDto {
  @ApiProperty({ description: 'Recipe id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Owner user id', format: 'uuid' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Dish reference id', format: 'uuid' })
  @Expose()
  mealId: string;

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

  @ApiPropertyOptional({ type: [String], description: 'Allergens' })
  @Expose()
  allergens?: string[];

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

  @ApiPropertyOptional({
    description: 'Attached dish',
    type: () => DishResponseDto,
  })
  @Expose()
  @Type(() => DishResponseDto)
  meal?: DishResponseDto;
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
