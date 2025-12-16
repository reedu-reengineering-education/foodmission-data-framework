import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TypeOfMeal } from '@prisma/client';
import { MealResponseDto } from '../../meal/dto/meal-response.dto';

export class MealLogResponseDto {
  @ApiProperty({ description: 'Meal log id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User id', format: 'uuid' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Meal id', format: 'uuid' })
  @Expose()
  mealId: string;

  @ApiProperty({ enum: TypeOfMeal })
  @Expose()
  typeOfMeal: TypeOfMeal;

  @ApiProperty({ description: 'Timestamp of the meal' })
  @Expose()
  timestamp: Date;

  @ApiProperty({ description: 'From pantry flag' })
  @Expose()
  mealFromPantry: boolean;

  @ApiProperty({ description: 'Eaten out flag' })
  @Expose()
  eatenOut: boolean;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Linked meal details',
    type: () => MealResponseDto,
  })
  @Expose()
  @Type(() => MealResponseDto)
  meal?: MealResponseDto;
}

export class MultipleMealLogResponseDto {
  @ApiProperty({ type: [MealLogResponseDto] })
  @Expose()
  data: MealLogResponseDto[];

  @ApiProperty({ description: 'Total logs' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Page' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Limit' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  @Expose()
  totalPages: number;
}
