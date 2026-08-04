import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { Expose } from 'class-transformer';

export class MicroLearningResponseDto {
  @ApiProperty({ example: 'uuid-micro-learning-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'ML.B1.1' })
  @Expose()
  code: string;

  @ApiPropertyOptional({ example: 'uuid-dimension-id' })
  @Expose()
  dimensionId?: string | null;

  @ApiPropertyOptional({ example: 'uuid-topic-id' })
  @Expose()
  topicId?: string | null;

  @ApiProperty({ example: 'Quick tip on leftovers' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'Cool leftovers within two hours.' })
  @Expose()
  body: string;

  @ApiPropertyOptional({ example: 'Use shallow containers.' })
  @Expose()
  tips?: string | null;

  @ApiProperty({ example: {} })
  @Expose()
  media: unknown;

  @ApiPropertyOptional({ enum: ContentLevel, example: ContentLevel.BEGINNER })
  @Expose()
  level?: ContentLevel | null;

  @ApiProperty({ example: true })
  @Expose()
  health: boolean;

  @ApiProperty({ example: false })
  @Expose()
  foodChoice: boolean;

  @ApiProperty({ example: true })
  @Expose()
  foodWaste: boolean;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;
}
