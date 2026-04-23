import { PartialType } from '@nestjs/swagger';
import { CreateMealItemDto } from './create-meal-item.dto';
import { IsOptional } from 'class-validator';
import { Unit } from '@prisma/client';

export class UpdateMealItemDto extends PartialType(CreateMealItemDto) {
  @IsOptional()
  mealId?: string;

  @IsOptional()
  foodProductId?: string;

  @IsOptional()
  genericFoodId?: string;

  @IsOptional()
  quantity?: number;

  @IsOptional()
  unit?: Unit;

  @IsOptional()
  notes?: string;
}
