import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @Type(() => Boolean)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Search in title or description',
    example: 'nutrition',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
