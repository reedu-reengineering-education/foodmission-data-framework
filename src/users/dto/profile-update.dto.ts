import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsPositive,
  IsObject,
  MaxLength,
  ValidateIf,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import {
  GenderLocal,
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from './create-user.dto';
import { UserSegment } from './gamification-enums.dto';
import { UserPreferencesDto } from './user-preferences.dto';
import { UserSettingsDto } from './user-settings.dto';

export class DimensionLevelInputDto {
  @ApiProperty({ example: 'DIET_CHANGES' })
  @IsString()
  dimensionCode!: string;

  @ApiProperty({ enum: ContentLevel })
  @IsEnum(ContentLevel)
  level!: ContentLevel;
}

export class ProfileUpdateDto {
  @ApiProperty({ description: 'Year of birth (YYYY)', required: false })
  @IsOptional()
  @IsInt()
  yearOfBirth?: number;

  @ApiProperty({ description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'Region / state / province', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'ZIP / postal code', required: false })
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiProperty({ description: 'Language preference', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  // Extended profile fields
  @ApiProperty({
    description: 'Gender',
    required: false,
    enum: Object.values(GenderLocal),
  })
  @IsOptional()
  @IsEnum(GenderLocal)
  gender?: GenderLocal | null;

  @ApiProperty({
    description: 'Annual income',
    required: false,
    enum: Object.values(AnnualIncomeLevel),
  })
  @IsOptional()
  @IsEnum(AnnualIncomeLevel)
  annualIncome?: AnnualIncomeLevel;

  @ApiProperty({
    description: 'Education level',
    required: false,
    enum: Object.values(EducationLevel),
  })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @IsPositive()
  @ApiProperty({ description: 'Weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsPositive()
  @ApiProperty({ description: 'Height in cm', required: false })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiProperty({
    description: 'Activity level',
    required: false,
    enum: Object.values(ActivityLevel),
  })
  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @ApiProperty({ description: 'Health goals (JSON)', required: false })
  @IsOptional()
  @IsObject()
  healthGoals?: Record<string, unknown>;

  @ApiProperty({ description: 'Nutrition targets (JSON)', required: false })
  @IsOptional()
  @IsObject()
  nutritionTargets?: Record<string, unknown>;

  @ApiProperty({
    description:
      'User preferences JSON. Known keys documented on UserPreferencesDto; ' +
      'extra keys are allowed. onboardingSurvey enums are validated in the service.',
    required: false,
    type: UserPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @ApiProperty({
    description:
      'User settings JSON. Known keys documented on UserSettingsDto; extra keys are allowed.',
    required: false,
    type: UserSettingsDto,
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiProperty({
    description:
      'Gamification segment chosen by the user at onboarding (BEGINNER / INTERMEDIATE / ADVANCED).',
    required: false,
    enum: Object.values(UserSegment),
  })
  @IsOptional()
  @IsEnum(UserSegment)
  segment?: UserSegment;

  @ApiProperty({
    description:
      'Id of the quest to make current. Pass null to clear. Selecting a ' +
      'quest starts nothing: start each mission with ' +
      'POST /missions/by-code/{code}/progress/start. Challenges need no ' +
      'start; complete them with PATCH /challenges/by-code/{code}/progress. ' +
      'Switching quests removes unfinished progress of the old quest.',
    required: false,
    nullable: true,
    example: 'seed-quest-dev-user',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  currentQuestId?: string | null;

  @ApiProperty({
    description:
      'Learning level per dimension chosen by the user, e.g. after reviewing ' +
      'the levels proposed by the onboarding survey. Any level can be set at ' +
      'any time; dimensions not listed keep their level. Levels set before ' +
      'the survey can still be raised (never lowered) by its first submission.',
    required: false,
    type: [DimensionLevelInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionLevelInputDto)
  dimensionLevels?: DimensionLevelInputDto[];
}
