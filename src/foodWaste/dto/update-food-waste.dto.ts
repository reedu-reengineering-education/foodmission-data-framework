import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WasteReason, Unit } from '@prisma/client';

export class UpdateFoodWasteDto {
  @ApiPropertyOptional({
    description: 'The ID of the pantry item that was wasted',
    example: 'uuid-pantry-item-id',
  })
  @IsOptional()
  @IsUUID()
  pantryItemId?: string;

  @ApiPropertyOptional({
    description: 'The ID of the food that was wasted',
    example: 'uuid-food-id',
  })
  @IsOptional()
  @IsUUID()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'The quantity of food wasted',
    example: 2.5,
    minimum: 0.01,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiPropertyOptional({
    description: 'The reason for the waste',
    example: 'EXPIRED',
    enum: WasteReason,
  })
  @IsOptional()
  @IsEnum(WasteReason)
  wasteReason?: WasteReason;

  @ApiPropertyOptional({
    description: 'Additional notes about the waste',
    example: 'Updated notes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Estimated economic cost of the waste (in local currency)',
    example: 5.99,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costEstimate?: number;

  @ApiPropertyOptional({
    description: 'Estimated carbon footprint (kg CO2 equivalent)',
    example: 1.25,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbonFootprint?: number;

  @ApiPropertyOptional({
    description: 'When the food was wasted (ISO date string)',
    example: '2026-02-13T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  wastedAt?: string;
}
