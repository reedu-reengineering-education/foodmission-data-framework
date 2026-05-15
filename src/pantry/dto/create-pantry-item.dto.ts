import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

@ValidatorConstraint({ name: 'ExclusiveFoodRef', async: false })
class ExclusiveFoodRefConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreatePantryItemDto;
    const hasProduct = !!obj.foodProductId;
    const hasGeneric = !!obj.genericFoodId;
    return hasProduct !== hasGeneric; // exactly one must be true (XOR)
  }

  defaultMessage(): string {
    return 'Exactly one of foodProductId or genericFoodId must be provided, not both or neither';
  }
}

export class CreatePantryItemDto {
  @ApiPropertyOptional({
    description:
      'The ID of the food product to add (OpenFoodFacts). Either foodProductId or genericFoodId must be provided.',
    example: 'uuid-food-product-id',
  })
  @IsUUID()
  @ValidateIf((o) => !o.genericFoodId)
  @IsNotEmpty()
  @Validate(ExclusiveFoodRefConstraint)
  foodProductId?: string;

  @ApiPropertyOptional({
    description:
      'UUID of the generic food (NEVO generic). Either foodProductId or genericFoodId must be provided.',
    example: 'uuid-generic-food-id',
  })
  @IsUUID()
  @ValidateIf((o) => !o.foodProductId)
  @IsNotEmpty()
  genericFoodId?: string;

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

/** Body for POST /pantry/items */
export class CreatePantryItemBodyDto extends CreatePantryItemDto {}
