import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  DailyFruitVegServings,
  HabitFrequency,
  LabelFamiliarity,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyLegumeFrequency,
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

  @ApiProperty({
    description:
      'How often legumes (beans, lentils, chickpeas, peas) are eaten',
    required: false,
    enum: Object.values(WeeklyLegumeFrequency),
  })
  @IsOptional()
  @IsEnum(WeeklyLegumeFrequency)
  weeklyLegumeConsumption?: WeeklyLegumeFrequency;

  @ApiProperty({
    description: 'How often the country of origin of food products is checked',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  checksCountryOfOrigin?: HabitFrequency;

  @ApiProperty({
    description:
      'How often seasonal fruit and vegetables are chosen intentionally',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  choosesSeasonalProduce?: HabitFrequency;

  @ApiProperty({
    description:
      'How often environmental or sustainability information is considered before purchasing food',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  considersSustainabilityInfo?: HabitFrequency;

  @ApiProperty({
    description:
      'How often ingredient lists are read before purchasing packaged foods',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  readsIngredientLists?: HabitFrequency;

  @ApiProperty({
    description: 'Familiarity with sustainability-related labels and claims',
    required: false,
    enum: Object.values(LabelFamiliarity),
  })
  @IsOptional()
  @IsEnum(LabelFamiliarity)
  sustainabilityLabelFamiliarity?: LabelFamiliarity;

  @ApiProperty({
    description: 'How often production methods influence purchasing decisions',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  productionMethodsInfluence?: HabitFrequency;

  @ApiProperty({
    description:
      'How often recycling/reuse/disposal instructions on packaging are checked',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  checksPackagingDisposal?: HabitFrequency;

  @ApiProperty({
    description: 'How often meals are planned before shopping',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  plansMealsBeforeShopping?: HabitFrequency;

  @ApiProperty({
    description: 'How often leftovers are deliberately used for another meal',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  usesLeftovers?: HabitFrequency;

  @ApiProperty({
    description: 'How often whole-grain foods are chosen',
    required: false,
    enum: Object.values(HabitFrequency),
  })
  @IsOptional()
  @IsEnum(HabitFrequency)
  wholeGrainFrequency?: HabitFrequency;

  @ApiProperty({
    description: 'Servings of fruit and vegetables usually consumed each day',
    required: false,
    enum: Object.values(DailyFruitVegServings),
  })
  @IsOptional()
  @IsEnum(DailyFruitVegServings)
  dailyFruitVegServings?: DailyFruitVegServings;
}
