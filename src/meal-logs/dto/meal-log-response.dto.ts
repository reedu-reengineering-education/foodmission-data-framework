import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TypeOfMeal } from '@prisma/client';
import {
  MEAL_FLAG_EVENT_TYPES,
  MEAL_SWAP_EVENT_TYPES,
  MealFlagEventType,
  MealSwapEventType,
} from '../../events/event-types';
import { MealResponseDto } from '../../meals/dto/meal-response.dto';

export class MealLogResponseDto {
  @ApiProperty({ description: 'Meal log id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User id', format: 'uuid' })
  @Expose()
  userId: string;

  @ApiPropertyOptional({
    description: 'Meal id — null for a quick log described by `flags` only',
    format: 'uuid',
    nullable: true,
  })
  @Expose()
  mealId: string | null;

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

  @ApiProperty({
    description: 'Diet facts reported for this meal, as event types',
    enum: [...MEAL_FLAG_EVENT_TYPES],
    isArray: true,
  })
  @Expose()
  flags: MealFlagEventType[];

  @ApiProperty({
    description: 'Substitutions reported for this meal, as event types',
    enum: [...MEAL_SWAP_EVENT_TYPES],
    isArray: true,
  })
  @Expose()
  swaps: MealSwapEventType[];

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
