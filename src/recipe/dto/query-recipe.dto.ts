import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  TransformCSVToStringArray,
  TransformTrimToUndefined,
} from '../../common/decorators/transformers';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryRecipeDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by meal type',
    enum: MealType,
  })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformCSVToStringArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by allergens', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformCSVToStringArray()
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Difficulty label' })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  search?: string;
}
