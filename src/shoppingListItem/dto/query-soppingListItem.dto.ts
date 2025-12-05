import { ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryShoppingListItemDto {
  @ApiPropertyOptional({
    description: 'Filter by shopping list ID',
    example: 'uuid-shopping-list-id',
  })
  @IsString()
  @IsOptional()
  shoppingListId?: string;

  @ApiPropertyOptional({
    description: 'Filter by food ID',
    example: 'uuid-food-id',
  })
  @IsString()
  @IsOptional()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'Filter by checked status',
    example: false,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  checked?: boolean;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @IsEnum(Unit)
  unit?: Unit = Unit.PIECES;
}
