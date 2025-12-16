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
import { Type } from 'class-transformer';
import { TransformBooleanString } from '../../common/decorators/transformers';

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
    description: 'Filter by underlying meal type',
  })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiPropertyOptional({ description: 'Only meals from pantry' })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  mealFromPantry?: boolean;

  @ApiPropertyOptional({ description: 'Only meals eaten out' })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  eatenOut?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
