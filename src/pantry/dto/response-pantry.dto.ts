import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PantryItemResponseDto } from '../../pantryItem/dto/response-pantryItem.dto';

export class PantryResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the pantry',
    example: 'uuid-pantry-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The user ID who owns this pantry',
    example: 'uuid-user-id',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'The pantry title',
    example: 'Home or Work',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'List of items in the pantry',
    type: [PantryItemResponseDto],
  })
  @Expose()
  @Type(() => PantryItemResponseDto)
  items: PantryItemResponseDto[];
}
