import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { ProgressWheelDto } from './progress-wheel.dto';

export class OnboardingSurveyAnswersDto {
  @ApiProperty({ enum: WeeklyMeatRange })
  @IsEnum(WeeklyMeatRange)
  weeklyMeatConsumption!: WeeklyMeatRange;

  @ApiProperty({ enum: WeeklyBeefFrequency })
  @IsEnum(WeeklyBeefFrequency)
  weeklyBeefConsumption!: WeeklyBeefFrequency;

  @ApiProperty({ enum: WeeklyFoodWasteRange })
  @IsEnum(WeeklyFoodWasteRange)
  weeklyFoodWaste!: WeeklyFoodWasteRange;

  @ApiProperty({ enum: WeeklyUpfRange })
  @IsEnum(WeeklyUpfRange)
  weeklyUpfConsumption!: WeeklyUpfRange;

  @ApiProperty({ enum: WeeklyReusableRange })
  @IsEnum(WeeklyReusableRange)
  weeklyReusableOrRefill!: WeeklyReusableRange;
}

export class OnboardingSurveyOptionDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  label!: string;
}

export class OnboardingSurveyQuestionDto {
  @ApiProperty({
    description: 'preferences.onboardingSurvey / PATCH /users/me field name',
  })
  field!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ type: [OnboardingSurveyOptionDto] })
  options!: OnboardingSurveyOptionDto[];
}

export class OnboardingSurveyDto {
  @ApiProperty({ type: [OnboardingSurveyQuestionDto] })
  questions!: OnboardingSurveyQuestionDto[];
}

export class OnboardingSurveyResultDto {
  @ApiProperty({
    enum: UserSegment,
    description: 'Sustainability profile computed from the answers',
  })
  segment!: UserSegment;

  @ApiProperty({ type: [ProgressWheelDto] })
  progressWheels!: ProgressWheelDto[];
}
