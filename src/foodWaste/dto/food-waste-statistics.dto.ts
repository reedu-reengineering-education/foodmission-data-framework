import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { WasteReason, DetectionMethod } from '@prisma/client';

export class WasteByReasonDto {
  @ApiProperty({ description: 'Waste reason', enum: WasteReason })
  @Expose()
  reason: WasteReason;

  @ApiProperty({ description: 'Count of waste entries', example: 5 })
  @Expose()
  count: number;
}

export class WasteByMethodDto {
  @ApiProperty({ description: 'Detection method', enum: DetectionMethod })
  @Expose()
  method: DetectionMethod;

  @ApiProperty({ description: 'Count of waste entries', example: 10 })
  @Expose()
  count: number;
}

export class MostWastedFoodDto {
  @ApiProperty({ description: 'Food ID', example: 'uuid-food-id' })
  @Expose()
  foodId: string;

  @ApiProperty({ description: 'Food name', example: 'Tomatoes' })
  @Expose()
  foodName: string;

  @ApiProperty({ description: 'Total quantity wasted', example: 5.5 })
  @Expose()
  totalQuantity: number;

  @ApiProperty({ description: 'Number of waste entries', example: 3 })
  @Expose()
  count: number;
}

export class FoodWasteStatisticsDto {
  @ApiProperty({
    description: 'Total quantity of food wasted',
    example: 25.5,
  })
  @Expose()
  totalWaste: number;

  @ApiProperty({
    description: 'Total economic cost of waste',
    example: 125.75,
  })
  @Expose()
  totalCost: number;

  @ApiProperty({
    description: 'Total carbon footprint (kg CO2)',
    example: 45.3,
  })
  @Expose()
  totalCarbon: number;

  @ApiProperty({
    description: 'Waste breakdown by reason',
    type: [WasteByReasonDto],
  })
  @Expose()
  @Type(() => WasteByReasonDto)
  wasteByReason: WasteByReasonDto[];

  @ApiProperty({
    description: 'Waste breakdown by detection method',
    type: [WasteByMethodDto],
  })
  @Expose()
  @Type(() => WasteByMethodDto)
  wasteByMethod: WasteByMethodDto[];

  @ApiProperty({
    description: 'Top 10 most wasted foods',
    type: [MostWastedFoodDto],
  })
  @Expose()
  @Type(() => MostWastedFoodDto)
  mostWastedFoods: MostWastedFoodDto[];

  @ApiProperty({
    description: 'Date range start (if filtered)',
    example: '2026-01-01',
    required: false,
  })
  @Expose()
  dateFrom?: string;

  @ApiProperty({
    description: 'Date range end (if filtered)',
    example: '2026-12-31',
    required: false,
  })
  @Expose()
  dateTo?: string;
}

export class WasteTrendDataPointDto {
  @ApiProperty({
    description: 'Date for this data point',
    example: '2026-02-13',
  })
  @Expose()
  date: Date;

  @ApiProperty({
    description: 'Total waste for this period',
    example: 5.5,
  })
  @Expose()
  totalWaste: number;

  @ApiProperty({
    description: 'Total cost for this period',
    example: 25.5,
  })
  @Expose()
  totalCost: number;

  @ApiProperty({
    description: 'Total carbon for this period',
    example: 8.75,
  })
  @Expose()
  totalCarbon: number;

  @ApiProperty({
    description: 'Number of waste entries',
    example: 3,
  })
  @Expose()
  count: number;
}

export class FoodWasteTrendsDto {
  @ApiProperty({
    description: 'Time series data',
    type: [WasteTrendDataPointDto],
  })
  @Expose()
  @Type(() => WasteTrendDataPointDto)
  data: WasteTrendDataPointDto[];

  @ApiProperty({
    description: 'Date range start',
    example: '2026-01-01',
  })
  @Expose()
  dateFrom: string;

  @ApiProperty({
    description: 'Date range end',
    example: '2026-12-31',
  })
  @Expose()
  dateTo: string;

  @ApiProperty({
    description: 'Time interval',
    example: 'day',
    enum: ['day', 'week', 'month'],
  })
  @Expose()
  interval: string;
}
