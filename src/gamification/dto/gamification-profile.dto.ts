import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
  level!: number;

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

export class GamificationEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional({ nullable: true })
  subjectType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  subjectId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  groupId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;
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

export class OnboardingBaselinesDto {
  @ApiPropertyOptional({ nullable: true })
  weeklyMeatConsumption!: string | null;

  @ApiPropertyOptional({ nullable: true })
  weeklyBeefConsumption!: string | null;

  @ApiPropertyOptional({ nullable: true })
  weeklyFoodWaste!: string | null;

  @ApiPropertyOptional({ nullable: true })
  weeklyUpfConsumption!: string | null;

  @ApiPropertyOptional({ nullable: true })
  weeklyReusableOrRefill!: string | null;
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

  @ApiProperty({ type: OnboardingBaselinesDto })
  onboardingBaselines!: OnboardingBaselinesDto;

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
    description: 'Earned badge ids (empty until Badge catalog exists)',
    example: [],
  })
  badges!: string[];

  @ApiProperty({ type: [GamificationEventDto] })
  recentEvents!: GamificationEventDto[];

  @ApiProperty({ type: [WalletEntryDto] })
  recentWalletEntries!: WalletEntryDto[];
}
