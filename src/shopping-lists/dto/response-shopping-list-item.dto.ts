import { FoodProductResponseDto } from '../../food-products/dto/food-product-response.dto';
import { GenericFoodResponseDto } from '../../generic-foods/dto/generic-food-response.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
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
    description: 'The type of item (food_product or generic_food)',
    example: 'food_product',
    enum: ['food_product', 'generic_food'],
  })
  @Expose()
  itemType: 'food_product' | 'generic_food';

  @ApiPropertyOptional({
    description: 'The ID of the food product (if itemType is food_product)',
    example: 'uuid-food-product-id',
  })
  @Expose()
  foodProductId: string | null;

  @ApiPropertyOptional({
    description: 'The ID of the generic food (if itemType is generic_food)',
    example: 'uuid-generic-food-id',
  })
  @Expose()
  genericFoodId: string | null;

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

  @ApiPropertyOptional({
    description: 'Associated food product (if itemType is food_product)',
    type: () => FoodProductResponseDto,
  })
  @Expose()
  @Type(() => FoodProductResponseDto)
  foodProduct: FoodProductResponseDto | null;

  @ApiPropertyOptional({
    description: 'Associated generic food (if itemType is generic_food)',
    type: () => GenericFoodResponseDto,
  })
  @Expose()
  @Type(() => GenericFoodResponseDto)
  genericFood: GenericFoodResponseDto | null;
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
