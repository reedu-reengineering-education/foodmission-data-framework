import { ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
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
    description: 'Filter by expiry date (ISO date string)',
    example: '2027-02-02',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;
}
