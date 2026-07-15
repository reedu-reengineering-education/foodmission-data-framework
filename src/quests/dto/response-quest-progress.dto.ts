import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class QuestProgressResponseDto {
  @ApiProperty({ example: 'uuid-quest-id' })
  @Expose()
  questId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  @Expose()
  userId: string;

  @ApiProperty({ example: false })
  @Expose()
  completed: boolean;

  @ApiProperty({ example: 0.5 })
  @Expose()
  progress: number;

  @ApiProperty({ example: 3 })
  @Expose()
  currentStreak: number;

  @ApiProperty({ example: 5 })
  @Expose()
  longestStreak: number;

  @ApiProperty({ example: 'Avoid single-use plastic' })
  @Expose()
  questTitle: string;
}
