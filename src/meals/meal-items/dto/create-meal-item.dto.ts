import {
  Allow,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';

@ValidatorConstraint({ name: 'ExclusiveFoodReference', async: false })
class ExclusiveFoodReferenceConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreateMealItemDto;
    const hasFood = !!obj.foodId;
    const hasCategory = !!obj.foodCategoryId;
    return hasFood !== hasCategory; // exactly one must be true (XOR)
  }

  defaultMessage(): string {
    return 'Exactly one of foodId or foodCategoryId must be provided, not both or neither';
  }
}

export class CreateMealItemDto {
  // mealId comes from URL path parameter, assigned by controller
  // @Allow() permits the property without validation
  @Allow()
  mealId: string;

  @ApiPropertyOptional({
    description:
      'UUID of the specific food product (OpenFoodFacts). Either foodId or foodCategoryId must be provided.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodCategoryId)
  @IsNotEmpty()
  @Validate(ExclusiveFoodReferenceConstraint)
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
}
