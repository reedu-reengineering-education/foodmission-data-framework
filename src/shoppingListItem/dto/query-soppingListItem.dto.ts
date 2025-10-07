import { ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
