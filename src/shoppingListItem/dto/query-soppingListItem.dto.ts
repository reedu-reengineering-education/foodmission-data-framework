import { ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import {
  TransformBooleanString,
  TransformEmptyStringToUndefined,
} from '../../common/decorators/transformers';

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
  @TransformEmptyStringToUndefined()
  @IsString()
  @IsOptional()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'Filter by checked status',
    example: false,
  })
  @TransformBooleanString()
  @IsBoolean()
  @IsOptional()
  checked?: boolean;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @TransformEmptyStringToUndefined()
  @IsEnum(Unit)
  @IsOptional()
  unit?: Unit;
}
