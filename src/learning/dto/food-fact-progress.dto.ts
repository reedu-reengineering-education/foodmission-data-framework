import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FoodFactRewardDto {
  @ApiPropertyOptional({ example: 10 })
  @Expose()
  xp?: number | null;

  @ApiPropertyOptional({ example: 15 })
  @Expose()
  points?: number | null;
}

export class FoodFactProgressResponseDto {
  @ApiPropertyOptional({ example: 'uuid-progress-id' })
  @Expose()
  id?: string;

  @ApiPropertyOptional({ example: 'uuid-user-id' })
  @Expose()
  userId: string;

  @ApiPropertyOptional({ example: 'uuid-food-fact-id' })
  @Expose()
  foodFactId: string;

  @ApiPropertyOptional({ example: 'FF1.1.1' })
  @Expose()
  foodFactCode: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  readAt: Date;

  @ApiPropertyOptional({ type: FoodFactRewardDto, nullable: true })
  @Expose()
  reward: FoodFactRewardDto | null;
}
