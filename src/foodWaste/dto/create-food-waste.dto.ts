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
  @ApiPropertyOptional({
    description: 'The ID of the pantry item that was wasted (if from pantry)',
    example: 'uuid-pantry-item-id',
  })
  @IsOptional()
  @IsUUID()
  pantryItemId?: string;

  @ApiProperty({
    description: 'The ID of the food that was wasted',
    example: 'uuid-food-id',
  })
  @IsNotEmpty()
  @IsUUID()
  foodId: string;

  @ApiProperty({
    description: 'The quantity of food wasted',
    example: 2.5,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @IsNotEmpty()
  @IsEnum(Unit)
  unit: Unit;

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

  @ApiProperty({
    description: 'When the food was wasted (ISO date string)',
    example: '2026-02-13T10:30:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  wastedAt: string;
}
