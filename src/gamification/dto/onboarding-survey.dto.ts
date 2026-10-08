import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  DailyFruitVegServings,
  HabitFrequency,
  LabelFamiliarity,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyLegumeFrequency,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { ProgressWheelDto } from './progress-wheel.dto';

/** Every answer is optional: users may skip any question (send nothing). */
export class OnboardingSurveyAnswersDto {
  @ApiPropertyOptional({ enum: WeeklyMeatRange })
  @IsOptional()
  @IsEnum(WeeklyMeatRange)
  weeklyMeatConsumption?: WeeklyMeatRange;

  @ApiPropertyOptional({ enum: WeeklyBeefFrequency })
  @IsOptional()
  @IsEnum(WeeklyBeefFrequency)
  weeklyBeefConsumption?: WeeklyBeefFrequency;

  @ApiPropertyOptional({ enum: WeeklyFoodWasteRange })
  @IsOptional()
  @IsEnum(WeeklyFoodWasteRange)
  weeklyFoodWaste?: WeeklyFoodWasteRange;

  @ApiPropertyOptional({ enum: WeeklyUpfRange })
  @IsOptional()
  @IsEnum(WeeklyUpfRange)
  weeklyUpfConsumption?: WeeklyUpfRange;

  @ApiPropertyOptional({ enum: WeeklyReusableRange })
  @IsOptional()
  @IsEnum(WeeklyReusableRange)
  weeklyReusableOrRefill?: WeeklyReusableRange;

  @ApiPropertyOptional({
    enum: WeeklyLegumeFrequency,
    description:
      'How often legumes (beans, lentils, chickpeas, peas) are eaten',
  })
  @IsOptional()
  @IsEnum(WeeklyLegumeFrequency)
  weeklyLegumeConsumption?: WeeklyLegumeFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description: 'How often the country of origin of food products is checked',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  checksCountryOfOrigin?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description:
      'How often seasonal fruit and vegetables are chosen intentionally',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  choosesSeasonalProduce?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description:
      'How often environmental or sustainability information is considered before purchasing food',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  considersSustainabilityInfo?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description:
      'How often ingredient lists are read before purchasing packaged foods',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  readsIngredientLists?: HabitFrequency;

  @ApiPropertyOptional({
    enum: LabelFamiliarity,
    description: 'Familiarity with sustainability-related labels and claims',
  })
  @IsOptional()
  @IsEnum(LabelFamiliarity)
  sustainabilityLabelFamiliarity?: LabelFamiliarity;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description: 'How often production methods influence purchasing decisions',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  productionMethodsInfluence?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description:
      'How often recycling/reuse/disposal instructions on packaging are checked',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  checksPackagingDisposal?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description: 'How often meals are planned before shopping',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  plansMealsBeforeShopping?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description: 'How often leftovers are deliberately used for another meal',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  usesLeftovers?: HabitFrequency;

  @ApiPropertyOptional({
    enum: HabitFrequency,
    description: 'How often whole-grain foods are chosen',
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  wholeGrainFrequency?: HabitFrequency;

  @ApiPropertyOptional({
    enum: DailyFruitVegServings,
    description: 'Servings of fruit and vegetables usually consumed each day',
  })
  @IsOptional()
  @IsEnum(DailyFruitVegServings)
  dailyFruitVegServings?: DailyFruitVegServings;
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
