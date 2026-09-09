import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserSegment } from '@prisma/client';
import { ProgressWheelDto } from './progress-wheel.dto';
import { WHEEL_IMPACT_ACTIONS } from '../wheel-impact-actions.config';

const ACTION_CODES = Object.keys(WHEEL_IMPACT_ACTIONS);

export class RecordWheelImpactDto {
  @ApiProperty({
    enum: ACTION_CODES,
    description: 'Code of the validated action to apply to the wheels',
  })
  @IsIn(ACTION_CODES)
  actionCode!: string;
}

export class WheelImpactAchievementDto {
  @ApiProperty()
  kind!: string;

  @ApiProperty({ description: 'How many stages this action completed' })
  stagesCompleted!: number;
}

export class DimensionPromotionDto {
  @ApiProperty({ enum: UserSegment })
  from!: UserSegment;

  @ApiProperty({ enum: UserSegment })
  to!: UserSegment;
}

export class RecordWheelImpactResultDto {
  @ApiProperty()
  actionCode!: string;

  @ApiProperty({
    type: [ProgressWheelDto],
    description:
      'The wheels this action touched — or, on a dimension promotion, all ' +
      'four wheels reset to stage 1 of the new dimension.',
  })
  wheels!: ProgressWheelDto[];

  @ApiProperty({
    type: [WheelImpactAchievementDto],
    description: 'Wheels that hit 100% and rolled over to a new stage/goal',
  })
  achievements!: WheelImpactAchievementDto[];

  @ApiPropertyOptional({
    type: DimensionPromotionDto,
    nullable: true,
    description:
      "Set when a wheel completed stage 5 and the user's overall " +
      'sustainability dimension advanced (BEGINNER -> INTERMEDIATE -> ' +
      'ADVANCED; all wheels reset to stage 1 of the new dimension). Null ' +
      'otherwise, and always null once already at ADVANCED.',
  })
  dimensionPromotion!: DimensionPromotionDto | null;
}
