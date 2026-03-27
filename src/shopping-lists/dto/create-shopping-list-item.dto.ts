import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
  IsEnum,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'ExclusiveFoodReference', async: false })
class ExclusiveFoodReferenceConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreateShoppingListItemDto;
    const hasFood = !!obj.foodId;
    const hasCategory = !!obj.foodCategoryId;
    return hasFood !== hasCategory; // exactly one must be true (XOR)
  }

  defaultMessage(): string {
    return 'Exactly one of foodId or foodCategoryId must be provided, not both or neither';
  }
}

export class CreateShoppingListItemDto {
  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @IsNotEmpty()
  @IsEnum(Unit)
  @IsOptional()
  unit: Unit = Unit.PIECES;

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

  @ApiPropertyOptional({
    description:
      'The ID of the food item (provide either foodId or foodCategoryId)',
    example: 'uuid-food-id',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodCategoryId)
  @IsNotEmpty()
  @Validate(ExclusiveFoodReferenceConstraint)
  foodId?: string;

  @ApiPropertyOptional({
    description:
      'The ID of the food category (provide either foodId or foodCategoryId)',
    example: 'uuid-food-category-id',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodId)
  @IsNotEmpty()
  foodCategoryId?: string;
}

/** Body for POST /shopping-lists/:shoppingListId/items (list id from URL). */
export class CreateShoppingListItemBodyDto extends OmitType(
  CreateShoppingListItemDto,
  ['shoppingListId'] as const,
) {}
