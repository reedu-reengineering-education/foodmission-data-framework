import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { WasteReason, DetectionMethod, Unit } from '@prisma/client';

export class ExpiredPantryItemDto {
  @ApiProperty({
    description: 'UUID of the expired pantry item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  pantryItemId: string;

  @ApiProperty({
    description: 'UUID of the food',
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
  })
  @Expose()
  foodId: string | null;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 2.5,
  })
  @Expose()
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: Unit,
    example: Unit.KG,
  })
  @Expose()
  unit: Unit;

  @ApiProperty({
    description: 'Expiry date of the item',
    example: '2026-03-15T00:00:00.000Z',
  })
  @Expose()
  expiryDate: Date;

  @ApiProperty({
    description: 'Food details',
    nullable: true,
  })
  @Expose()
  @Type(() => Object)
  food: any;

  @ApiProperty({
    description: 'Suggested waste reason for this expired item',
    enum: WasteReason,
    example: WasteReason.EXPIRED,
  })
  @Expose()
  suggestedWasteReason: WasteReason;

  @ApiProperty({
    description: 'Suggested detection method',
    enum: DetectionMethod,
    example: DetectionMethod.AUTOMATIC,
  })
  @Expose()
  suggestedDetectionMethod: DetectionMethod;
}
