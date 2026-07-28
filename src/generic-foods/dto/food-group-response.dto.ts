import { ApiProperty } from '@nestjs/swagger';

export class FoodGroupResponseDto {
  @ApiProperty({
    description:
      'Stable slug derived from the English food group label (for icon matching)',
    example: 'potatoes-and-tubers',
  })
  slug: string;

  @ApiProperty({
    description: 'Localized food group display name',
    example: 'Potatoes and tubers',
  })
  name: string;
}
