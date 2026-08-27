import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserPreferencesDto } from '../../users/dto/user-preferences.dto';
import { UserEventDto } from '../../events/dto/user-event.dto';

export class GamificationProfileQueryDto {
  @ApiPropertyOptional({
    description: 'Max recent gamification events to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  eventsLimit?: number = 20;

  @ApiPropertyOptional({
    description: 'Max recent wallet entries to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  walletEntriesLimit?: number = 20;
}

export class GamificationWalletDto {
  @ApiProperty()
  xp!: number;

  @ApiProperty()
  points!: number;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProgressIndicatorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  kind!: string;

  @ApiProperty()
  precision!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty()
  accumulatedValue!: number;

  @ApiProperty()
  targetValue!: number;

  @ApiProperty()
  allTimeTotal!: number;

  @ApiProperty()
  cycleStartedAt!: Date;

  @ApiProperty()
  lastUpdatedAt!: Date;
}

export class WalletEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['XP', 'POINTS'] })
  currency!: string;

  @ApiProperty({ description: 'Signed amount (credit > 0, debit < 0)' })
  amount!: number;

  @ApiProperty()
  balanceAfter!: number;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional({ nullable: true })
  eventId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class GamificationProfileResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({
    nullable: true,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
  segment!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Opaque current quest id (string until Quest catalog exists with UUID PKs)',
  })
  currentQuestId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Last authenticated activity (throttled; updated by DataBaseAuthGuard)',
  })
  lastLoginAt!: Date | null;

  @ApiProperty({
    type: UserPreferencesDto,
    description:
      'User preferences including onboardingSurvey (same shape as PATCH /users/me)',
  })
  preferences!: UserPreferencesDto;

  @ApiPropertyOptional({
    type: GamificationWalletDto,
    nullable: true,
    description: 'Null when the user has no wallet yet',
  })
  wallet!: GamificationWalletDto | null;

  @ApiProperty({ type: [ProgressIndicatorDto] })
  progressIndicators!: ProgressIndicatorDto[];

  @ApiProperty({
    type: [String],
    description:
      'Earned badge ids from BadgeService (empty until Badge catalog exists)',
    example: [],
  })
  badges!: string[];

  @ApiProperty({ type: [UserEventDto] })
  recentEvents!: UserEventDto[];

  @ApiProperty({ type: [WalletEntryDto] })
  recentWalletEntries!: WalletEntryDto[];
}

export class WalletBalanceDto {
  @ApiProperty({ description: 'Current XP balance' })
  xp!: number;

  @ApiProperty({ description: 'Current points balance' })
  points!: number;

  @ApiProperty({ description: 'When wallet was last updated' })
  updatedAt!: Date;
}

export class EarnedRewardDto {
  @ApiProperty({ description: 'Unique ID of earned reward' })
  id!: string;

  @ApiProperty({ description: 'The reward that was earned' })
  reward!: {
    id: string;
    name: string;
    points?: number | null;
    xp?: number | null;
    badgeId?: string | null;
    avatarItem?: string | null;
    petItem?: string | null;
    collectible?: string | null;
  };

  @ApiPropertyOptional({ enum: ['MISSION', 'CHALLENGE', 'QUEST', 'QUIZ'] })
  sourceType?: string | null;

  @ApiPropertyOptional({ description: 'ID of the mission/challenge/quest/quiz' })
  sourceId?: string | null;

  @ApiProperty({ description: 'When the reward was earned' })
  earnedAt!: Date;
}

export class UserEarnedRewardsDto {
  @ApiProperty({ type: [EarnedRewardDto] })
  earnedRewards!: EarnedRewardDto[];

  @ApiProperty({ type: WalletBalanceDto })
  wallet!: WalletBalanceDto;
}
