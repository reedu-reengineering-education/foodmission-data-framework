import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { WasteReason, DetectionMethod } from '@prisma/client';

export class QueryFoodWasteDto {
  @ApiPropertyOptional({
    description: 'Filter by food ID',
    example: 'uuid-food-id',
  })
  @IsOptional()
  @IsUUID()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'Filter by pantry item ID',
    example: 'uuid-pantry-item-id',
  })
  @IsOptional()
  @IsUUID()
  pantryItemId?: string;

  @ApiPropertyOptional({
    description: 'Filter by waste reason',
    enum: WasteReason,
  })
  @IsOptional()
  @IsEnum(WasteReason)
  wasteReason?: WasteReason;

  @ApiPropertyOptional({
    description: 'Filter by detection method',
    enum: DetectionMethod,
  })
  @IsOptional()
  @IsEnum(DetectionMethod)
  detectionMethod?: DetectionMethod;

  @ApiPropertyOptional({
    description: 'Filter by waste date from (ISO date string)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by waste date to (ISO date string)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
