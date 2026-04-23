import { ApiProperty } from '@nestjs/swagger';

export class FoodCategoryResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'NEVO version', example: 'NEVO-Online 2025 9.0' })
  nevoVersion: string;

  @ApiProperty({
    description: 'Food group',
    example: 'Potatoes and tubers',
  })
  foodGroup: string;

  @ApiProperty({ description: 'Food name', example: 'Potato' })
  foodName: string;

  @ApiProperty({ description: 'Synonym', example: 'Spud', required: false })
  synonym?: string;
}
