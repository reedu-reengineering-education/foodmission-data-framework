import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { Expose } from 'class-transformer';
import { FoodFactRewardDto } from './food-fact-progress.dto';

export class FoodFactResponseDto {
  @ApiProperty({ example: 'uuid-food-fact-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'FF1.1.1' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'uuid-topic-id' })
  @Expose()
  topicId: string;

  @ApiProperty({
    example:
      'Eating less red meat is one of the most effective ways to reduce the environmental impact of your diet.',
  })
  @Expose()
  body: string;

  @ApiPropertyOptional({ example: 'Mazac et al. (2022)' })
  @Expose()
  source?: string | null;

  @ApiProperty({ enum: ContentLevel, example: ContentLevel.BEGINNER })
  @Expose()
  level: ContentLevel;

  @ApiProperty({ example: false })
  @Expose()
  health: boolean;

  @ApiProperty({ example: true })
  @Expose()
  foodChoice: boolean;

  @ApiProperty({ example: false })
  @Expose()
  foodWaste: boolean;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description:
      'When the current user first read this fact. Set on authenticated single-fact GETs, which count as a read.',
  })
  @Expose()
  readAt?: Date;

  @ApiPropertyOptional({
    type: FoodFactRewardDto,
    nullable: true,
    description:
      'Reward credited to the current user for reading this fact (idempotent — a re-read replays the original credit). Null when the fact has no reward or crediting failed.',
  })
  @Expose()
  reward?: FoodFactRewardDto | null;
}
