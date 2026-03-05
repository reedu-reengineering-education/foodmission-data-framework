import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  TransformCSVToStringArray,
  TransformTrimToUndefined,
} from '../../common/decorators/transformers';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryRecipeDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Chicken',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by cuisine type',
    example: 'Italian',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  cuisineType?: string;

  @ApiPropertyOptional({
    description: 'Filter by source',
    example: 'themealdb',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter public recipes only',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by dietary labels',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformCSVToStringArray()
  dietaryLabels?: string[];

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
