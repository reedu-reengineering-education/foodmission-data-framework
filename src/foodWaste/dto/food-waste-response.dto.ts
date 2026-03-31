import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { WasteReason, DetectionMethod, Unit } from '@prisma/client';
import { FoodResponseDto } from '../../foods/dto/food-response.dto';

export class FoodWasteResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the waste entry',
    example: 'uuid-waste-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The user ID who owns this waste entry',
    example: 'uuid-user-id',
  })
  @Expose()
  userId: string;

  @ApiPropertyOptional({
    description: 'The pantry item ID',
    example: 'uuid-pantry-item-id',
  })
  @Expose()
  pantryItemId?: string;

  @ApiProperty({
    description: 'The food ID',
    example: 'uuid-food-id',
  })
  @Expose()
  foodId: string;

  @ApiProperty({
    description: 'The quantity of food wasted',
    example: 2.5,
  })
  @Expose()
  quantity: number;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'KG',
    enum: Unit,
  })
  @Expose()
  unit: Unit;

  @ApiProperty({
    description: 'The reason for the waste',
    example: 'EXPIRED',
    enum: WasteReason,
  })
  @Expose()
  wasteReason: WasteReason;

  @ApiProperty({
    description: 'How the waste was detected',
    example: 'MANUAL',
    enum: DetectionMethod,
  })
  @Expose()
  detectionMethod: DetectionMethod;

  @ApiPropertyOptional({
    description: 'Additional notes about the waste',
    example: 'Found moldy in the fridge',
  })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Estimated economic cost',
    example: 5.99,
  })
  @Expose()
  costEstimate?: number;

  @ApiPropertyOptional({
    description: 'Estimated carbon footprint (kg CO2)',
    example: 1.25,
  })
  @Expose()
  carbonFootprint?: number;

  @ApiProperty({
    description: 'When the food was wasted',
    example: '2026-02-13T10:30:00.000Z',
  })
  @Expose()
  wastedAt: Date;

  @ApiProperty({
    description: 'When record was created',
    example: '2026-02-13T10:30:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'When record was last updated',
    example: '2026-02-13T10:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'The food item details',
    type: () => FoodResponseDto,
  })
  @Expose()
  @Type(() => FoodResponseDto)
  food?: FoodResponseDto;
}

export class MultipleFoodWasteResponseDto {
  @ApiProperty({
    description: 'Array of food waste entries',
    type: [FoodWasteResponseDto],
  })
  @Expose()
  @Type(() => FoodWasteResponseDto)
  data: FoodWasteResponseDto[];

  @ApiProperty({
    description: 'Total number of records',
    example: 100,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @Expose()
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  @Expose()
  totalPages: number;
}
