import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel, QuestContentType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';

export class QuestItemResponseDto {
  @ApiProperty({ example: 'uuid-item-id' })
  @Expose()
  id: string;

  @ApiProperty({ enum: QuestContentType, example: QuestContentType.FOOD_FACT })
  @Expose()
  contentType: QuestContentType;

  @ApiProperty({ example: 'FF.B1.1' })
  @Expose()
  contentCode: string;

  @ApiProperty({ example: 0 })
  @Expose()
  sortOrder: number;
}

export class QuestResponseDto {
  @ApiProperty({ example: 'uuid-quest-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'QUEST.B.BEGINNER' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'uuid-dimension-id' })
  @Expose()
  dimensionId: string;

  @ApiProperty({ enum: ContentLevel, example: ContentLevel.BEGINNER })
  @Expose()
  level: ContentLevel;

  @ApiPropertyOptional({ example: 'Beginner Packaging Quest' })
  @Expose()
  title?: string | null;

  @ApiPropertyOptional({ example: 'Learn the basics of food packaging.' })
  @Expose()
  description?: string | null;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;

  @ApiPropertyOptional({ type: [QuestItemResponseDto] })
  @Expose()
  @Type(() => QuestItemResponseDto)
  items?: QuestItemResponseDto[];
}
