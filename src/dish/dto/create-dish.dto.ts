import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsObject,
} from 'class-validator';
import { MealType } from '@prisma/client';

export class CreateDishDto {
  @ApiProperty({ description: 'Dish name', example: 'Grilled chicken salad' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MealType, description: 'Meal type' })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiPropertyOptional({ description: 'Calories for the dish', example: 520 })
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
  @Min(0)
  sustainabilityScore?: number;

  @ApiPropertyOptional({
    description: 'Link to pantry item if sourced from pantry',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  pantryItemId?: string;

  @ApiPropertyOptional({
    description: 'Barcode of the dish (if packaged)',
  })
  @IsOptional()
  @IsString()
  barcode?: string;
}
