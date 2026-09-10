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

  @ApiProperty({ example: 'Bring Your Own Bag' })
  @Expose()
  challengeTitle: string;

  @ApiPropertyOptional({
    type: ChallengeRewardDto,
    description:
      'Set only when this update first completed the challenge and earned a reward',
  })
  @Expose()
  @Type(() => ChallengeRewardDto)
  reward?: ChallengeRewardDto | null;
}
