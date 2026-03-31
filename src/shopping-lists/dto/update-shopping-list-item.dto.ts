import { ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export class UpdateShoppingListItemDto {
  @ApiPropertyOptional({
    description: 'The quantity of the item',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @IsEnum(Unit)
  unit?: Unit = Unit.PIECES;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Buy organic if available',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is checked off',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  checked?: boolean;

  @ApiPropertyOptional({
    description: 'The ID of the shopping list',
    example: 'uuid-shopping-list-id',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  shoppingListId?: string;

  @ApiPropertyOptional({
    description: 'The ID of the food item',
    example: 'uuid-food-id',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  foodId?: string;
}
