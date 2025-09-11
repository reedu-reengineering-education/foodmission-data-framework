import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ShoppingListResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the shopping list',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Expose()
  id: string;

  
    @ApiProperty({
    description: 'UUID of the user who created this shopping list',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @Expose()
  userId: string;


    @ApiProperty({
    description: 'title of the shopping list',
    example: 'Family shopping list',
  })
  @Expose()
  title: string;
}


export class PaginatedShoppingListResponseDto {
    @ApiProperty({
      description: 'Array of shopping lists',
      type: [ShoppingListResponseDto],
    })
    @Expose()
    @Type(() => ShoppingListResponseDto)
    data: ShoppingListResponseDto[];
  
  @ApiProperty({
    description: 'Total number of food items matching the query',
    example: 150,
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
    description: 'Number of items per page',
    example: 10,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  @Expose()
  totalPages: number;
}