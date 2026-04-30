import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WasteReason, DetectionMethod, Unit } from '@prisma/client';

export class CreateFoodWasteDto {
  @ApiProperty({
    description:
      'The ID of the pantry item that was wasted. Food info and unit are automatically derived from the pantry item.',
    example: 'uuid-pantry-item-id',
  })
  @IsNotEmpty()
  @IsUUID()
  pantryItemId: string;

  @ApiPropertyOptional({
    description:
      'The quantity of the item that was wasted. If not provided, assumes the entire pantry item was wasted. If provided and less than the full quantity, the pantry item quantity will be reduced.',
    example: 2.5,
    minimum: 0.01,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({
    description:
      'The unit for the wasted quantity. If not provided, uses the pantry item unit. Must be compatible with the pantry item unit (e.g., KG/G or L/ML).',
    example: 'KG',
    enum: Unit,
  })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiProperty({
    description: 'The reason for the waste',
    example: 'EXPIRED',
    enum: WasteReason,
  })
  @IsNotEmpty()
  @IsEnum(WasteReason)
  wasteReason: WasteReason;

  @ApiProperty({
    description: 'How the waste was detected (automatic or manual)',
    example: 'MANUAL',
    enum: DetectionMethod,
  })
  @IsNotEmpty()
  @IsEnum(DetectionMethod)
  detectionMethod: DetectionMethod;

  @ApiPropertyOptional({
    description: 'Additional notes about the waste',
    example: 'Found moldy in the back of the fridge',
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
    description:
      'When the food was wasted (ISO date string). Defaults to current time.',
    example: '2026-02-13T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  wastedAt?: string;
}
