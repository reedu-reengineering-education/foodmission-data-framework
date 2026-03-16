import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransformTrimToUndefined } from '../../common/decorators/transformers';

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
