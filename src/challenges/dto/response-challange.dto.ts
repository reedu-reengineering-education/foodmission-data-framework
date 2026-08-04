import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { Expose } from 'class-transformer';

export class ChallengeResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the challenge',
    example: 'uuid-challenge-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Unique challenge code',
    example: 'CH.B1.1',
  })
  @Expose()
  code: string;

  @ApiProperty({
    description: 'Dimension id',
    example: 'uuid-dimension-id',
  })
  @Expose()
  dimensionId: string;

  @ApiPropertyOptional({
    description: 'Optional topic id',
    example: 'uuid-topic-id',
  })
  @Expose()
  topicId?: string | null;

  @ApiProperty({
    description: 'Content difficulty level',
    enum: ContentLevel,
    example: ContentLevel.BEGINNER,
  })
  @Expose()
  level: ContentLevel;

  @ApiProperty({
    description: 'The challenge title',
    example: 'Bring Your Own Bag',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'The challenge task',
    example: 'Use a reusable shopping bag for your groceries today',
  })
  @Expose()
  task: string;

  @ApiProperty({
    description: 'Why this challenge matters',
    example: 'Reusable bags cut plastic waste from everyday shopping',
  })
  @Expose()
  whyItMatters: string;

  @ApiProperty({
    description: 'Content tag codes derived from boolean flags',
    example: ['FOOD_CHOICE', 'FOOD_AND_WASTE'],
    type: [String],
  })
  @Expose()
  tags: string[];

  @ApiProperty({
    description: 'Whether the challenge relates to health',
    example: false,
  })
  @Expose()
  health: boolean;

  @ApiProperty({
    description: 'Whether the challenge relates to food choice',
    example: true,
  })
  @Expose()
  foodChoice: boolean;

  @ApiProperty({
    description: 'Whether the challenge relates to food waste',
    example: false,
  })
  @Expose()
  foodWaste: boolean;

  @ApiProperty({
    description: 'Indicates if the challenge is currently available',
    example: true,
  })
  @Expose()
  available: boolean;

  @ApiProperty({
    description: 'Aggregate challenge progress across users (0-100 scale)',
    example: 50,
  })
  @Expose()
  progress: number;
}
