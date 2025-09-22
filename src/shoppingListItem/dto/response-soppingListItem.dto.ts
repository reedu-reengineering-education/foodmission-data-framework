import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ShoppingListItemResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the shopping list item',
    example: 'uuid-item-id',
  })
  id: string;

  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'kg',
  })
  unit: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Buy organic if available',
  })
  notes?: string;

  @ApiProperty({
    description: 'Whether the item is checked off',
    example: false,
  })
  checked: boolean;

  @ApiProperty({
    description: 'The ID of the shopping list',
    example: 'uuid-shopping-list-id',
  })
  shoppingListId: string;

  @ApiProperty({
    description: 'The ID of the food item',
    example: 'uuid-food-id',
  })
  foodId: string;

  @ApiProperty({
    description: 'The creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update timestamp',
    example: '2024-01-15T11:30:00.000Z',
  })
  updatedAt: Date;
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
