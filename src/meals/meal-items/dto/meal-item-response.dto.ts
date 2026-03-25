import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { FoodResponseDto } from '../../../foods/dto/food-response.dto';
import { FoodCategoryResponseDto } from '../../../foodCategories/dto/food-category-response.dto';

export class MealItemResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the meal item',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'UUID of the meal this item belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  mealId: string;

  @ApiProperty({
    description:
      'Type of item - either a specific food product or a generic food category',
    enum: ['food', 'food_category'],
    example: 'food',
  })
  itemType: 'food' | 'food_category';

  @ApiPropertyOptional({
    description: 'UUID of the specific food product (if itemType is "food")',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  foodId: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the food category (if itemType is "food_category")',
    example: '550e8400-e29b-41d4-a716-446655440003',
    nullable: true,
  })
  foodCategoryId: string | null;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: Unit,
    example: Unit.PIECES,
  })
  unit: Unit;

  @ApiPropertyOptional({
    description: 'Optional notes about this meal item',
    example: 'Extra spicy',
    nullable: true,
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Food product details (if itemType is "food")',
    type: () => FoodResponseDto,
    nullable: true,
  })
  food?: FoodResponseDto | null;

  @ApiPropertyOptional({
    description: 'Food category details (if itemType is "food_category")',
    type: () => FoodCategoryResponseDto,
    nullable: true,
  })
  foodCategory?: FoodCategoryResponseDto | null;

  @ApiProperty({
    description: 'Timestamp when the meal item was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the meal item was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
