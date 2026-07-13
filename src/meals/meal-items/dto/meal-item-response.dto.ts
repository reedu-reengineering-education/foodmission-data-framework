import { FoodProductResponseDto } from '../../../food-products/dto/food-product-response.dto';
import { GenericFoodResponseDto } from '../../../generic-foods/dto/generic-food-response.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';

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
    enum: ['food_product', 'generic_food'],
    example: 'food_product',
  })
  itemType: 'food_product' | 'generic_food';

  @ApiPropertyOptional({
    description:
      'UUID of the specific food product (if itemType is "food_product")',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  foodProductId: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the generic food (if itemType is "generic_food")',
    example: '550e8400-e29b-41d4-a716-446655440003',
    nullable: true,
  })
  genericFoodId: string | null;

  @ApiPropertyOptional({
    description: 'Quantity of the item',
    example: 2,
    nullable: true,
  })
  quantity: number | null;

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
    description: 'Food product details (if itemType is "food_product")',
    type: () => FoodProductResponseDto,
    nullable: true,
  })
  foodProduct?: FoodProductResponseDto | null;

  @ApiPropertyOptional({
    description: 'Generic food details (if itemType is "generic_food")',
    type: () => GenericFoodResponseDto,
    nullable: true,
  })
  genericFood?: GenericFoodResponseDto | null;

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
