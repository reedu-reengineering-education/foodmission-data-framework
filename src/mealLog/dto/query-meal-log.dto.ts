import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealType, TypeOfMeal } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TransformBooleanString } from '../../common/decorators/transformers';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryMealLogDto extends PaginationQueryDto {
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
}
