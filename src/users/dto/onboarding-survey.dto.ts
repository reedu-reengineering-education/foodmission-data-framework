import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from './gamification-enums.dto';

export class OnboardingSurveyDto {
  @ApiProperty({
    description: 'Weekly meat consumption range',
    required: false,
    enum: Object.values(WeeklyMeatRange),
  })
  @IsOptional()
  @IsEnum(WeeklyMeatRange)
  weeklyMeatConsumption?: WeeklyMeatRange;

  @ApiProperty({
    description: 'Weekly beef consumption frequency',
    required: false,
    enum: Object.values(WeeklyBeefFrequency),
  })
  @IsOptional()
  @IsEnum(WeeklyBeefFrequency)
  weeklyBeefConsumption?: WeeklyBeefFrequency;

  @ApiProperty({
    description: 'Weekly edible food thrown away',
    required: false,
    enum: Object.values(WeeklyFoodWasteRange),
  })
  @IsOptional()
  @IsEnum(WeeklyFoodWasteRange)
  weeklyFoodWaste?: WeeklyFoodWasteRange;

  @ApiProperty({
    description: 'Weekly ultra-processed food consumption',
    required: false,
    enum: Object.values(WeeklyUpfRange),
  })
  @IsOptional()
  @IsEnum(WeeklyUpfRange)
  weeklyUpfConsumption?: WeeklyUpfRange;

  @ApiProperty({
    description: 'Weekly use of reusable containers or refill products',
    required: false,
    enum: Object.values(WeeklyReusableRange),
  })
  @IsOptional()
  @IsEnum(WeeklyReusableRange)
  weeklyReusableOrRefill?: WeeklyReusableRange;
}
