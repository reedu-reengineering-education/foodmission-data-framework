import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformTrimToUndefined } from '../../common/decorators/transformers';
import { DietaryLabel, MealCategory, MealCourse } from '@prisma/client';

export class QueryMealDto {
  @ApiPropertyOptional({ description: 'Filter by recipe id', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @ApiPropertyOptional({ description: 'Search by name substring' })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by meal category',
    enum: MealCategory,
  })
  @IsOptional()
  @IsEnum(MealCategory)
  mealCategory?: MealCategory;

  @ApiPropertyOptional({
    description: 'Filter by meal course',
    enum: MealCourse,
  })
  @IsOptional()
  @IsEnum(MealCourse)
  mealCourse?: MealCourse;

  @ApiPropertyOptional({
    description: 'Filter by dietary preference',
    enum: DietaryLabel,
  })
  @IsOptional()
  @IsEnum(DietaryLabel)
  dietaryPreference?: DietaryLabel;

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
