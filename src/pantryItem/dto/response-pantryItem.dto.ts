import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FoodResponseDto } from '../../food/dto/food-response.dto';
import { Unit } from '@prisma/client';

export class PantryItemResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the pantry item',
    example: 'uuid-item-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
    minimum: 1,
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

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Store in cool place',
    maxLength: 500,
  })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({
    description: 'When the food will expire',
    example: '2027-02-02T00:00:00.000Z',
  })
  @Expose()
  expiryDate?: Date;

  @ApiProperty({
    description: 'The ID of the pantry',
    example: 'uuid-pantry-id',
  })
  @Expose()
  pantryId: string;

  @ApiProperty({
    description: 'The ID of the food item',
    example: 'uuid-food-id',
  })
  @Expose()
  foodId: string;

  @ApiPropertyOptional({
    description: 'The food item details',
    type: () => FoodResponseDto,
  })
  @Expose()
  @Type(() => FoodResponseDto)
  food?: FoodResponseDto;
}

export class MultiplePantryItemResponseDto {
  @ApiProperty({
    description: 'Array of pantry items',
    type: [PantryItemResponseDto],
  })
  @Expose()
  @Type(() => PantryItemResponseDto)
  data: PantryItemResponseDto[];
}
