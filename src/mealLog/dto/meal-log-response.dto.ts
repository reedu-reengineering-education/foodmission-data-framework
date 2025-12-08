import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TypeOfMeal } from '@prisma/client';
import { DishResponseDto } from '../../dish/dto/dish-response.dto';

export class MealLogResponseDto {
  @ApiProperty({ description: 'Meal log id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User id', format: 'uuid' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Dish id', format: 'uuid' })
  @Expose()
  dishId: string;

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
    description: 'Linked dish details',
    type: () => DishResponseDto,
  })
  @Expose()
  @Type(() => DishResponseDto)
  dish?: DishResponseDto;
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
