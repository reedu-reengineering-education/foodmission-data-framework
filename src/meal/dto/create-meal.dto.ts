import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsObject,
  IsNumber,
  IsArray,
  IsEnum,
  ArrayMaxSize,
} from 'class-validator';
import { DietaryLabel, MealCategory, MealCourse } from '@prisma/client';

export class CreateMealDto {
  @ApiProperty({ description: 'Meal name', example: 'Grilled chicken salad' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional recipe this meal is based on',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @ApiPropertyOptional({ description: 'Calories for the meal', example: 520 })
  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ description: 'Protein amount in grams', example: 42 })
  @IsOptional()
  @IsInt()
  @Min(0)
  proteins?: number;

  @ApiPropertyOptional({
    description: 'Structured nutritional information',
    example: { carbs: 40, fats: 20, sugar: 5 },
  })
  @IsOptional()
  @IsObject()
  nutritionalInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sustainability score',
    example: 0.72,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sustainabilityScore?: number;

  @ApiPropertyOptional({
    description: 'Estimated meal price or cost',
    example: 8.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Barcode of the meal (if packaged)',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Meal categories for filtering and analytics',
    enum: MealCategory,
    isArray: true,
    example: [MealCategory.ANIMAL_PROTEIN, MealCategory.STARCH_GRAIN],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(MealCategory, { each: true })
  mealCategories?: MealCategory[];

  @ApiPropertyOptional({
    description: 'Meal course role',
    enum: MealCourse,
    example: MealCourse.MAIN_DISH,
  })
  @IsOptional()
  @IsEnum(MealCourse)
  mealCourse?: MealCourse;

  @ApiPropertyOptional({
    description: 'Dietary preferences associated with this meal',
    enum: DietaryLabel,
    isArray: true,
    example: [DietaryLabel.VEGAN],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(DietaryLabel, { each: true })
  dietaryPreferences?: DietaryLabel[];
}
