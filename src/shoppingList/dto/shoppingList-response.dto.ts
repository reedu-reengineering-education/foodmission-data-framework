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
    description: 'Name of the shopping list',
    example: 'Family shopping list',
  })
  @Expose()
  name: string;
}
