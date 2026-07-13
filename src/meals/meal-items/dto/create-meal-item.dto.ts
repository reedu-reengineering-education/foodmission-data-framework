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

@ValidatorConstraint({ name: 'ExclusiveFoodRef', async: false })
class ExclusiveFoodRefConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreateMealItemDto;
    const hasProduct = !!obj.foodProductId;
    const hasGeneric = !!obj.genericFoodId;
    return hasProduct !== hasGeneric; // exactly one must be true (XOR)
  }

  defaultMessage(): string {
    return 'Exactly one of foodProductId or genericFoodId must be provided, not both or neither';
  }
}

export class CreateMealItemDto {
  // mealId comes from URL path parameter, assigned by controller
  // @Allow() permits the property without validation
  @Allow()
  mealId: string;

  @ApiPropertyOptional({
    description:
      'UUID of the specific food product (OpenFoodFacts). Either foodProductId or genericFoodId must be provided.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @ValidateIf((o) => !o.genericFoodId)
  @IsNotEmpty()
  @Validate(ExclusiveFoodRefConstraint)
  foodProductId?: string;

  @ApiPropertyOptional({
    description:
      'UUID of the generic food (NEVO generic). Either foodProductId or genericFoodId must be provided.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodProductId)
  @IsNotEmpty()
  genericFoodId?: string;

  @ApiPropertyOptional({
    description: 'Quantity of the item',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

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
