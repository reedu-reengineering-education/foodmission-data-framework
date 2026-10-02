import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ChallengeRewardDto {
  @ApiPropertyOptional({ example: 15 })
  @Expose()
  xp?: number | null;

  @ApiPropertyOptional({ example: 20 })
  @Expose()
  points?: number | null;
}

export class ChallengeProgressResponseDto {
  @ApiProperty({ example: 'uuid-challenge-id' })
  @Expose()
  challengeId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  @Expose()
  userId: string;

  @ApiProperty({ example: 50 })
  @Expose()
  progress: number;

  @ApiProperty({ example: false })
  @Expose()
  completed: boolean;

  @ApiProperty({
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
    example: 'IN_PROGRESS',
    description:
      'FAILED: the rule window ended without the goal, the rule failed, or ' +
      'the user gave up. COMPLETED and FAILED are final.',
  })
  @Expose()
  status: string;

  @ApiProperty({ example: 'Bring Your Own Bag' })
  @Expose()
  challengeTitle: string;

  @ApiPropertyOptional({
    example: '2026-09-30T08:15:00.000Z',
    nullable: true,
    description: 'When the user started the challenge; null if not started',
  })
  @Expose()
  startedAt?: Date | null;

  @ApiPropertyOptional({
    type: ChallengeRewardDto,
    description:
      'Set only when this update first completed the challenge and earned a reward',
  })
  @Expose()
  @Type(() => ChallengeRewardDto)
  reward?: ChallengeRewardDto | null;
}
