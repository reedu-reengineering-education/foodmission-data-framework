import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FoodResponseDto } from '../../foods/dto/food-response.dto';
import { FoodCategoryResponseDto } from '../../food-category/dto/food-category-response.dto';
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
  expiryDateSource?: string;

  @ApiProperty({
    description: 'The ID of the pantry',
    example: 'uuid-pantry-id',
  })
  @Expose()
  pantryId: string;

  @ApiPropertyOptional({
    description: 'The ID of the food item',
    example: 'uuid-food-id',
  })
  @Expose()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'The ID of the food category',
    example: 'uuid-food-category-id',
  })
  @Expose()
  foodCategoryId?: string;

  @ApiPropertyOptional({
    description: 'The food item details',
    type: () => FoodResponseDto,
  })
  @Expose()
  @Type(() => FoodResponseDto)
  food?: FoodResponseDto;

  @ApiPropertyOptional({
    description: 'The food category details',
    type: () => FoodCategoryResponseDto,
  })
  @Expose()
  @Type(() => FoodCategoryResponseDto)
  foodCategory?: FoodCategoryResponseDto;
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
