import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

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
}
