import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class QueryPantryItemDto {
  @ApiProperty({
    description: 'The ID of the pantry to get items from',
    example: 'uuid-pantry-id',
  })
  @IsNotEmpty()
  @IsUUID()
  pantryId: string;

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
