import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateShoppingListItemDto {
  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'kg',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string = 'pieces';

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Buy organic if available',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({
    description: 'Whether the item is checked off',
    example: false,
  })
  @IsBoolean()
  checked: boolean = false;

  @ApiProperty({
    description: 'The ID of the shopping list',
    example: 'uuid-shopping-list-id',
  })
  @IsString()
  @IsNotEmpty()
  shoppingListId: string;

  @ApiProperty({
    description: 'The ID of the food item',
    example: 'uuid-food-id',
  })
  @IsString()
  @IsNotEmpty()
  foodId: string;
}
