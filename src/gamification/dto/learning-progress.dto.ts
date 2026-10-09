import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel, QuestContentType } from '@prisma/client';
import { KNOWLEDGE_KINDS } from '../knowledge-progress.config';

export class ContentItemProgressDto {
  @ApiProperty({ enum: QuestContentType })
  contentType!: QuestContentType;

  @ApiProperty({ example: 'M.B1.1' })
  contentCode!: string;

  @ApiProperty({
    description:
      'Mission/challenge title, quiz question or food fact text (English)',
  })
  title!: string;

  @ApiProperty({
    description:
      'Mission/challenge completed, quiz answered correctly, food fact read',
  })
  finished!: boolean;
}

export class QuestLevelProgressDto {
  @ApiProperty()
  questId!: string;

  @ApiProperty({ example: 'QUEST.DIET_CHANGES.BEGINNER.1' })
  questCode!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ minimum: 0, maximum: 100 })
  progress!: number;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty()
  finishedItems!: number;

  @ApiProperty({ description: 'Trackable items (micro-learnings excluded)' })
  totalItems!: number;

  @ApiPropertyOptional({
    type: [ContentItemProgressDto],
    description: 'Only on the single-dimension endpoint',
  })
  items?: ContentItemProgressDto[];
}

export class DimensionProgressDto {
  @ApiProperty({ example: 'DIET_CHANGES' })
  dimensionCode!: string;

  @ApiProperty()
  dimensionName!: string;

  @ApiProperty({ enum: ContentLevel })
  level!: ContentLevel;

  @ApiProperty({
    type: [QuestLevelProgressDto],
    description:
      "Available quests at the user's level in this dimension. Completing " +
      'all of them moves the dimension to the next level.',
  })
  quests!: QuestLevelProgressDto[];
}

export class KnowledgeProgressDto {
  @ApiProperty({ enum: KNOWLEDGE_KINDS })
  kind!: string;

  @ApiProperty()
  finishedItems!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  percentComplete!: number;

  @ApiPropertyOptional({
    type: [ContentItemProgressDto],
    description: 'Only on the single-bar endpoint',
  })
  items?: ContentItemProgressDto[];
}
