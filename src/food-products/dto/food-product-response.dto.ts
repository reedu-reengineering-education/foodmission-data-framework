import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FoodProductResponseDto {
  @ApiProperty({ description: 'The name of the food product' })
  @Expose()
  name!: string;
}
