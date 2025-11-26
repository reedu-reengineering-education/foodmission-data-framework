import { ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsUUID,
  IsEnum,
} from 'class-validator';

export class QueryPantryItemDto {
  @ApiPropertyOptional({
    description: 'Filter by food ID',
    example: 'uuid-food-id',
  })
  @IsUUID()
  @IsOptional()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @IsEnum(Unit)
  @IsOptional()
  unit?: Unit;

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
