import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { FoodResponseDto } from '../../food/dto/food-response.dto';
import { FoodCategoryResponseDto } from '../../foodCategory/dto/food-category-response.dto';
import { ShoppingListResponseDto } from '../../shoppingList/dto/shoppingList-response.dto';
import { Unit } from '@prisma/client';

@Exclude()
export class ShoppingListItemResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the shopping list item',
    example: 'uuid-item-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
  })
  @Expose()
  quantity: number;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'kg',
  })
  @Expose()
  unit: Unit;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Buy organic if available',
  })
  @Expose()
  notes: string | null;

  @ApiProperty({
    description: 'Whether the item is checked off',
    example: false,
  })
  @Expose()
  checked: boolean;

  @ApiProperty({
    description: 'The ID of the shopping list',
    example: 'uuid-shopping-list-id',
  })
  @Expose()
  shoppingListId: string;

  @ApiProperty({
    description: 'The type of item (food or food_category)',
    example: 'food',
    enum: ['food', 'food_category'],
  })
  @Expose()
  itemType: 'food' | 'food_category';

  @ApiPropertyOptional({
    description: 'The ID of the food item (if itemType is food)',
    example: 'uuid-food-id',
  })
  @Expose()
  foodId: string | null;

  @ApiPropertyOptional({
    description: 'The ID of the food category (if itemType is food_category)',
    example: 'uuid-food-category-id',
  })
  @Expose()
  foodCategoryId: string | null;

  @ApiProperty({
    description: 'The creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp',
    example: '2024-01-15T11:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'Associated shopping list',
    type: () => ShoppingListResponseDto,
  })
  @Expose()
  @Type(() => ShoppingListResponseDto)
  shoppingList: ShoppingListResponseDto;

  @ApiPropertyOptional({
    description: 'Associated food item (if itemType is food)',
    type: () => FoodResponseDto,
  })
  @Expose()
  @Type(() => FoodResponseDto)
  food: FoodResponseDto | null;

  @ApiPropertyOptional({
    description: 'Associated food category (if itemType is food_category)',
    type: () => FoodCategoryResponseDto,
  })
  @Expose()
  @Type(() => FoodCategoryResponseDto)
  foodCategory: FoodCategoryResponseDto | null;
}

export class MultipleShoppingListItemResponseDto {
  @ApiProperty({
    description: 'Array of shopping list items',
    type: [ShoppingListItemResponseDto],
  })
  @Expose()
  @Type(() => ShoppingListItemResponseDto)
  data: ShoppingListItemResponseDto[];
}
