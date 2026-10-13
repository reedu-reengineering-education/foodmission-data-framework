import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { ContentLevel, ProgressStatus, QuestContentType } from '@prisma/client';
import { KNOWLEDGE_KINDS } from '../knowledge-progress.config';

export class ContentItemProgressDto {
  @ApiProperty({ enum: QuestContentType })
  contentType!: QuestContentType;

  @ApiProperty({ example: 'M.B1.1' })
  contentCode!: string;

  @ApiProperty({
    description:
      'Mission/challenge title, quiz question or food fact text. English, ' +
      'except on the single knowledge-bar endpoint, which honours `lang`.',
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

export class QuestItemStatusDto extends ContentItemProgressDto {
  @ApiProperty({
    enum: ProgressStatus,
    description:
      'Missions/challenges: their progress status. Quizzes: COMPLETED when ' +
      'answered correctly, FAILED when answered wrong. Food facts: COMPLETED ' +
      'once read. NOT_STARTED otherwise.',
  })
  status!: ProgressStatus;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'Partial progress for missions/challenges, else 0 or 100',
  })
  progress!: number;

  @ApiProperty()
  sortOrder!: number;
}

export class CurrentQuestDto extends OmitType(QuestLevelProgressDto, [
  'items',
] as const) {
  @ApiProperty({ example: 'DIET_CHANGES' })
  dimensionCode!: string;

  @ApiProperty({ enum: ContentLevel })
  level!: ContentLevel;

  @ApiProperty({
    type: [QuestItemStatusDto],
    description: 'Trackable items in quest order (micro-learnings excluded)',
  })
  items!: QuestItemStatusDto[];
}
