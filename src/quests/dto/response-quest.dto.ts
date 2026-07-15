import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChallengeScope, ProgressTrackingType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';

export class QuestChallengeResponseDto {
  @ApiProperty({ example: 'uuid-challenge-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'refuse-plastic-bottle' })
  @Expose()
  slug: string;

  @ApiProperty({ example: 'Refuse a plastic bottle' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'Decline a single-use plastic bottle today' })
  @Expose()
  description: string;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;

  @ApiProperty({ enum: ChallengeScope, example: ChallengeScope.QUEST_ONE_TIME })
  @Expose()
  challengeScope: ChallengeScope;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @Expose()
  startDate: Date;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z' })
  @Expose()
  endDate: Date;
}

export class QuestResponseDto {
  @ApiProperty({ example: 'uuid-quest-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'avoid-single-use-plastic' })
  @Expose()
  slug: string;

  @ApiProperty({ example: 'uuid-mission-id' })
  @Expose()
  missionId: string;

  @ApiProperty({ example: 'Avoid single-use plastic' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'Skip disposable plastic items in your daily routine' })
  @Expose()
  description: string;

  @ApiPropertyOptional({ example: 'plastic-waste' })
  @Expose()
  topicSlug?: string | null;

  @ApiProperty({ example: 0 })
  @Expose()
  sortOrder: number;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;

  @ApiProperty({ example: true })
  @Expose()
  streakEnabled: boolean;

  @ApiProperty({ enum: ProgressTrackingType, example: ProgressTrackingType.SOFT })
  @Expose()
  progressTrackingType: ProgressTrackingType;

  @ApiPropertyOptional({ type: [QuestChallengeResponseDto] })
  @Expose()
  @Type(() => QuestChallengeResponseDto)
  challenges?: QuestChallengeResponseDto[];
}
