import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FoodCategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Search query for food name or synonym',
    example: 'potato',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by food group',
    example: 'Potatoes and tubers',
  })
  @IsOptional()
  @IsString()
  foodGroup?: string;
}
