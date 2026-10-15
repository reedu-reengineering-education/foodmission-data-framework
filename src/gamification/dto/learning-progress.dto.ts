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
      'Title of the mission, challenge, quiz or food fact, in `lang`',
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
      'Missions/challenges: their progress status; a started mission is ' +
      'IN_PROGRESS even at progress 0. Quizzes: COMPLETED when answered ' +
      'correctly, FAILED when answered wrong. Food facts: COMPLETED once ' +
      'read. NOT_STARTED otherwise.',
  })
  status!: ProgressStatus;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'Partial progress for missions/challenges, else 0 or 100',
  })
  progress!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Missions/challenges: when it was started. For a mission, null means ' +
      'the user has not started it yet; start it with ' +
      'POST /missions/by-code/{code}/progress/start. Challenges need no ' +
      'start; theirs is set on their first progress. Always null for ' +
      'quizzes and food facts.',
  })
  startedAt!: Date | null;

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
