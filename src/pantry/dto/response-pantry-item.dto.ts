import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Unit } from '@prisma/client';
import { FoodProductResponseDto } from '../../food-products/dto/food-product-response.dto';
import { GenericFoodResponseDto } from '../../generic-foods/dto/generic-food-response.dto';

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
    description: 'Location where the item is stored',
    example: 'Top shelf, pantry',
    maxLength: 200,
  })
  @Expose()
  location?: string;

  @ApiPropertyOptional({
    description: 'When the food will expire',
    example: '2027-02-02T00:00:00.000Z',
  })
  @Expose()
  expiryDate?: Date;

  @ApiPropertyOptional({
    description: 'Source of expiry date calculation',
    example: 'auto_foodkeeper',
    enum: ['manual', 'auto_foodkeeper'],
  })
  @Expose()
  expiryDateSource?: 'manual' | 'auto_foodkeeper';

  @ApiProperty({
    description: 'The ID of the pantry',
    example: 'uuid-pantry-id',
  })
  @Expose()
  pantryId: string;

  @ApiPropertyOptional({
    description: 'The ID of the food product',
    example: 'uuid-food-product-id',
  })
  @Expose()
  foodProductId?: string;

  @ApiPropertyOptional({
    description: 'The ID of the generic food',
    example: 'uuid-generic-food-id',
  })
  @Expose()
  genericFoodId?: string;

  @ApiPropertyOptional({
    description: 'The food product details',
    type: () => FoodProductResponseDto,
  })
  @Expose()
  @Type(() => FoodProductResponseDto)
  foodProduct?: FoodProductResponseDto;

  @ApiPropertyOptional({
    description: 'The generic food details',
    type: () => GenericFoodResponseDto,
  })
  @Expose()
  @Type(() => GenericFoodResponseDto)
  genericFood?: GenericFoodResponseDto;
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
