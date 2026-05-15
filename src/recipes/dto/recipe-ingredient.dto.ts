import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * Validator: ensures 0 or 1 of foodProductId/genericFoodId is provided (not both)
 */
@ValidatorConstraint({ name: 'OptionalExclusiveFoodReference', async: false })
class OptionalExclusiveFoodReferenceConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreateRecipeIngredientDto;
    const hasFood = !!obj.foodProductId;
    const hasCategory = !!obj.genericFoodId;
    // Valid if neither or exactly one is provided (not both)
    return !(hasFood && hasCategory);
  }

  defaultMessage(): string {
    return 'Only one of foodProductId or genericFoodId can be provided, not both';
  }
}

/**
 * DTO for creating a recipe ingredient
 */
export class CreateRecipeIngredientDto {
  @ApiProperty({
    description: 'Ingredient name',
    example: 'Chicken Breast',
  })
  @IsString()
  @IsNotEmpty()
  @Validate(OptionalExclusiveFoodReferenceConstraint) // runs on whole object (args.object)
  name: string;

  @ApiPropertyOptional({
    description: 'Measurement/amount',
    example: '500g',
  })
  @IsString()
  @IsOptional()
  measure?: string;

  @ApiPropertyOptional({
    description: 'Order in the recipe',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'ID of linked food product (OpenFoodFacts product)',
    example: 'uuid-food-product-id',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.genericFoodId)
  @Validate(OptionalExclusiveFoodReferenceConstraint)
  foodProductId?: string;

  @ApiPropertyOptional({
    description: 'ID of linked generic food (NEVO generic food)',
    example: 'uuid-generic-food-id',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => !o.foodProductId)
  genericFoodId?: string;
}

/**
 * DTO for updating a recipe ingredient
 */
export class UpdateRecipeIngredientDto {
  @ApiPropertyOptional({
    description: 'Ingredient name',
    example: 'Chicken Thigh',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Measurement/amount',
    example: '600g',
  })
  @IsString()
  @IsOptional()
  measure?: string;

  @ApiPropertyOptional({
    description: 'Order in the recipe',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'ID of linked food product (OpenFoodFacts product)',
    example: 'uuid-food-product-id',
  })
  @IsUUID()
  @IsOptional()
  foodProductId?: string;

  @ApiPropertyOptional({
    description: 'ID of linked generic food (NEVO generic food)',
    example: 'uuid-generic-food-id',
  })
  @IsUUID()
  @IsOptional()
  genericFoodId?: string;
}

/**
 * Response DTO for a recipe ingredient
 */
export class RecipeIngredientResponseDto {
  @ApiProperty({ description: 'Ingredient ID', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Recipe ID', format: 'uuid' })
  @Expose()
  recipeId: string;

  @ApiProperty({ description: 'Ingredient name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Measurement/amount' })
  @Expose()
  measure?: string;

  @ApiProperty({ description: 'Order in recipe' })
  @Expose()
  order: number;

  @ApiProperty({ description: 'Item type (food_product or generic_food)' })
  @Expose()
  itemType: string;

  @ApiPropertyOptional({
    description: 'Linked food product ID',
    format: 'uuid',
  })
  @Expose()
  foodProductId?: string;

  @ApiPropertyOptional({
    description: 'Linked generic food ID',
    format: 'uuid',
  })
  @Expose()
  genericFoodId?: string;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt: Date;

  // Optional expanded relations (plain objects passed through)
  @ApiPropertyOptional({ description: 'Linked food product details' })
  @Expose()
  foodProduct?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Linked generic food details' })
  @Expose()
  genericFood?: Record<string, any>;
}
