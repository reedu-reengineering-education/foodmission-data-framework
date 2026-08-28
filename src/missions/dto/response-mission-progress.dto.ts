import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class MissionRewardDto {
  @ApiPropertyOptional({ example: 15 })
  @Expose()
  xp?: number | null;

  @ApiPropertyOptional({ example: 20 })
  @Expose()
  points?: number | null;
}

export class MissionProgressResponseDto {
  @ApiProperty({ example: 'uuid-mission-id' })
  @Expose()
  missionId: string;

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
  missionTitle: string;

  @ApiPropertyOptional({
    type: MissionRewardDto,
    description:
      'Set only when this update first completed the mission and earned a reward',
  })
  @Expose()
  @Type(() => MissionRewardDto)
  reward?: MissionRewardDto | null;
}
