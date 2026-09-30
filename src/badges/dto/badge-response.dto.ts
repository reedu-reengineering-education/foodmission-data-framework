import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgressStatus } from '../../common/progress-status';

export class BadgeDto {
  @ApiProperty({ description: 'Stable badge identifier', example: 'CHEF' })
  code!: string;

  @ApiProperty({ example: 'Chef' })
  name!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'View 5 different recipes.',
  })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Display order in the badge gallery' })
  sortOrder!: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Rule in badges.rules.yml that awards this badge. Null means it is granted by hand.',
    example: 'CHEF',
  })
  ruleCode!: string | null;
}

export class UserBadgeDto extends BadgeDto {
  @ApiProperty({ description: 'True once the badge is in the user’s gallery' })
  earned!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'When it was earned; null while unearned',
  })
  earnedAt!: Date | null;

  @ApiProperty({
    description:
      'Server-derived, 0–100. Always 100 for an earned badge; 0 for one whose rule has never matched.',
    minimum: 0,
    maximum: 100,
  })
  progress!: number;

  @ApiProperty({ enum: ProgressStatus })
  status!: ProgressStatus;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Counter values behind `progress`, e.g. `{ "recipesViewed": 3 }`. Null until the badge is first evaluated.',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  counters!: Record<string, number> | null;
}

export class UserBadgesResponseDto {
  @ApiProperty({ type: [UserBadgeDto] })
  badges!: UserBadgeDto[];

  @ApiProperty({ description: 'How many of them are earned' })
  earnedCount!: number;

  @ApiProperty({ description: 'How many badges exist' })
  totalCount!: number;
}

export class BadgesResponseDto {
  @ApiProperty({ type: [BadgeDto] })
  badges!: BadgeDto[];

  @ApiProperty()
  total!: number;
}
