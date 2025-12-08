import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealType, TypeOfMeal } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class QueryMealLogDto {
  @ApiPropertyOptional({ description: 'From date ISO' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'To date ISO' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: TypeOfMeal, description: 'Meal type filter' })
  @IsOptional()
  @IsEnum(TypeOfMeal)
  typeOfMeal?: TypeOfMeal;

  @ApiPropertyOptional({
    enum: MealType,
    description: 'Filter by underlying dish meal type',
  })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiPropertyOptional({ description: 'Only meals from pantry' })
  @IsOptional()
  @IsBoolean()
  mealFromPantry?: boolean;

  @ApiPropertyOptional({ description: 'Only meals eaten out' })
  @IsOptional()
  @IsBoolean()
  eatenOut?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
