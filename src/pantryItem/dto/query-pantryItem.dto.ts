import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsDate } from 'class-validator';

export class QueryPantryItemDto {
  @ApiPropertyOptional({
    description: 'Filter by food ID',
    example: 'uuid-food-id',
  })
  @IsString()
  @IsOptional()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'Filter by unit',
    example: 'kg',
  })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({
    description: 'where the Item is located',
    example: 'refrigerator',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'when the food will expires',
    example: '02-02-2027',
    maxLength: 500,
  })
  @IsDate()
  @IsOptional()
  expiryDate?: Date;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
