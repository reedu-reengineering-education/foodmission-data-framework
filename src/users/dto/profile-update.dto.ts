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
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  GenderLocal,
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from './create-user.dto';
import { UserSegment } from './gamification-enums.dto';
import { UserPreferencesDto } from './user-preferences.dto';
import { UserSettingsDto } from './user-settings.dto';

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
      'Gamification segment. Optional — if omitted when onboarding baselines are complete, server derives it.',
    required: false,
    enum: Object.values(UserSegment),
  })
  @IsOptional()
  @IsEnum(UserSegment)
  segment?: UserSegment;

  @ApiProperty({
    description:
      'Opaque current quest id (string until Quest catalog exists with UUID PKs). ' +
      'Pass null to clear. Will become UUID + FK when Quest model lands.',
    required: false,
    nullable: true,
    example: 'seed-quest-dev-user',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  currentQuestId?: string | null;
}
