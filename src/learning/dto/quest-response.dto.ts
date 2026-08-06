import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel, QuestContentType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';

export class QuestItemResponseDto {
  @ApiProperty({ example: 'uuid-item-id' })
  @Expose()
  id: string;

  @ApiProperty({ enum: QuestContentType, example: QuestContentType.MISSION })
  @Expose()
  contentType: QuestContentType;

  @ApiProperty({ example: 'M.A1.1' })
  @Expose()
  contentCode: string;

  @ApiPropertyOptional({
    description: 'Translated display label for the referenced content',
    example: 'Stay in the Green Zone',
  })
  @Expose()
  label?: string;

  @ApiProperty({ example: 0 })
  @Expose()
  sortOrder: number;
}

export class QuestResponseDto {
  @ApiProperty({ example: 'uuid-quest-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'QUEST.DIET_CHANGES.BEGINNER' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'uuid-dimension-id' })
  @Expose()
  dimensionId: string;

  @ApiProperty({ enum: ContentLevel, example: ContentLevel.BEGINNER })
  @Expose()
  level: ContentLevel;

  @ApiPropertyOptional({ example: 'Diet changes — Beginner' })
  @Expose()
  title?: string | null;

  @ApiPropertyOptional({
    example: 'Beginner quest for more sustainable diet changes.',
  })
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
