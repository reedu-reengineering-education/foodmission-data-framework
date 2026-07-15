import { ApiProperty } from '@nestjs/swagger';
import { ProgressTrackingType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateQuestDto {
  @ApiProperty({
    description:
      'Stable quest slug matching gamification.quests.{slug} in src/i18n/en/gamification.json',
    example: 'avoid-single-use-plastic',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  slug: string;

  @ApiProperty({ example: 'uuid-mission-id' })
  @IsUUID()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  available: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  streakEnabled: boolean;

  @ApiProperty({ enum: ProgressTrackingType, example: ProgressTrackingType.SOFT })
  @IsEnum(ProgressTrackingType)
  progressTrackingType: ProgressTrackingType;

  @ApiProperty({ required: false, example: 'plastic-waste' })
  @IsOptional()
  @IsString()
  topicSlug?: string;
}
