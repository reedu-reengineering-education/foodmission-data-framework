import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Expose } from 'class-transformer';

export class QuestRewardDto {
  @ApiPropertyOptional({ example: 15 })
  @Expose()
  xp?: number | null;

  @ApiPropertyOptional({ example: 20 })
  @Expose()
  points?: number | null;
}

export class UpdateQuestProgressDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description: 'Quest completion progress on a 0–100 scale',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class QuestProgressResponseDto {
  @ApiProperty({ example: 'uuid-user-id' })
  @Expose()
  userId: string;

  @ApiProperty({ example: 'uuid-quest-id' })
  @Expose()
  questId: string;

  @ApiProperty({ example: 'QUEST.DIET_CHANGES.BEGINNER.1' })
  @Expose()
  questCode: string;

  @ApiPropertyOptional({ example: 'Diet changes — Beginner' })
  @Expose()
  questTitle?: string | null;

  @ApiPropertyOptional({ example: '2026-08-04T12:00:00.000Z' })
  @Expose()
  unlockedAt?: Date | null;

  @ApiProperty({ example: false })
  @Expose()
  completed: boolean;

  @ApiProperty({ example: 0 })
  @Expose()
  progress: number;

  @ApiPropertyOptional({
    type: QuestRewardDto,
    description: 'Set only when this update first completed the quest and earned a reward',
  })
  @Expose()
  @Type(() => QuestRewardDto)
  reward?: QuestRewardDto | null;
}