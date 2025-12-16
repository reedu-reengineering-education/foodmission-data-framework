import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { MealType } from '@prisma/client';

export class MealResponseDto {
  @ApiProperty({ description: 'Meal id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Meal name' })
  @Expose()
  name: string;

  @ApiProperty({ enum: MealType, description: 'Meal type' })
  @Expose()
  mealType: MealType;

  @ApiPropertyOptional({ description: 'Calories' })
  @Expose()
  calories?: number;

  @ApiPropertyOptional({ description: 'Proteins' })
  @Expose()
  proteins?: number;

  @ApiPropertyOptional({ description: 'Nutritional information' })
  @Expose()
  nutritionalInfo?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Sustainability score' })
  @Expose()
  sustainabilityScore?: number;

  @ApiPropertyOptional({ description: 'Linked pantry item id', format: 'uuid' })
  @Expose()
  pantryItemId?: string | null;

  @ApiPropertyOptional({ description: 'Barcode' })
  @Expose()
  barcode?: string | null;

  @ApiProperty({ description: 'User owner', format: 'uuid' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Created at ISO date' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at ISO date' })
  @Expose()
  updatedAt: Date;
}

export class MultipleMealResponseDto {
  @ApiProperty({ type: [MealResponseDto] })
  @Expose()
  data: MealResponseDto[];

  @ApiProperty({ description: 'Total meals' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Page number' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Items per page' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  @Expose()
  totalPages: number;
}
