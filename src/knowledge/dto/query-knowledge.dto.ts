import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  TransformBooleanString,
  TransformTrimToUndefined,
} from 'src/common/decorators/transformers';

export class QueryKnowledgeDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by availability',
    example: true,
  })
  @IsOptional()
  @Type(() => TransformBooleanString)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Search in title or description',
    example: 'nutrition',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  search?: string;
}
