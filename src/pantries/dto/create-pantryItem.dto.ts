import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
  IsEnum,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'ExclusiveFoodReference', async: false })
class ExclusiveFoodReferenceConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreatePantryItemDto;
    const hasFood = !!obj.foodId;
    const hasCategory = !!obj.foodCategoryId;
    return hasFood !== hasCategory; // exactly one must be true (XOR)
  }

  defaultMessage(): string {
    return 'Exactly one of foodId or foodCategoryId must be provided, not both or neither';
  }
}

export class CreatePantryItemDto {
  @ApiPropertyOptional({
    description:
      'The ID of the food item to add (OpenFoodFacts). Either foodId or foodCategoryId must be provided.',
    example: 'uuid-food-id',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodCategoryId)
  @IsNotEmpty()
  @Validate(ExclusiveFoodReferenceConstraint)
  foodId?: string;

  @ApiPropertyOptional({
    description:
      'UUID of the food category (NEVO generic). Either foodId or foodCategoryId must be provided.',
    example: 'uuid-food-category-id',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodId)
  @IsNotEmpty()
  foodCategoryId?: string;

  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    description: 'The unit of measurement (defaults to PIECES if not provided)',
    example: 'KG',
    enum: Unit,
    default: Unit.PIECES,
  })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Store in cool place',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Location where the item is stored',
    example: 'Top shelf, pantry',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    description: 'When the food will expire (ISO date string)',
    example: '2027-02-02',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;
}

/** Body for POST /pantries/:pantryId/items (pantryId comes from the URL). */
export class CreatePantryItemBodyDto extends OmitType(CreatePantryItemDto, [
  'pantryId',
] as const) {}
