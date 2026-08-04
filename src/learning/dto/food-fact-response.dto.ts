import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { Expose } from 'class-transformer';

export class FoodFactResponseDto {
  @ApiProperty({ example: 'uuid-food-fact-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'FF.B1.1' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'uuid-topic-id' })
  @Expose()
  topicId: string;

  @ApiProperty({ example: 'Plastic packaging can leach chemicals into food.' })
  @Expose()
  body: string;

  @ApiPropertyOptional({ example: 'WHO 2023' })
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
}
