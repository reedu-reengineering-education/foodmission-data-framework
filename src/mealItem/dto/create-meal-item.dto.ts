import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';

export class CreateMealItemDto {
  @ApiProperty({
    description: 'UUID of the meal this item belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  mealId: string;

  @ApiPropertyOptional({
    description:
      'UUID of the specific food product (OpenFoodFacts). Either foodId or foodCategoryId must be provided.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodCategoryId)
  @IsNotEmpty()
  foodId?: string;

  @ApiPropertyOptional({
    description:
      'UUID of the food category (NEVO generic). Either foodId or foodCategoryId must be provided.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodId)
  @IsNotEmpty()
  foodCategoryId?: string;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 2,
    default: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: Unit,
    example: Unit.PIECES,
    default: Unit.PIECES,
  })
  @IsEnum(Unit)
  unit: Unit = Unit.PIECES;

  @ApiPropertyOptional({
    description: 'Optional notes about this meal item',
    example: 'Extra spicy',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  constructor(
    foodId: string,
    foodCategoryId: undefined,
    quantity?: number,
    unit?: Unit,
  );
  constructor(
    foodId: undefined,
    foodCategoryId: string,
    quantity?: number,
    unit?: Unit,
  );
  constructor(
    foodId?: string,
    foodCategoryId?: string,
    quantity?: number,
    unit?: Unit,
  ) {
    this.foodId = foodId;
    this.foodCategoryId = foodCategoryId;
    this.quantity = quantity ?? 1;
    this.unit = unit ?? Unit.PIECES;
  }
}
