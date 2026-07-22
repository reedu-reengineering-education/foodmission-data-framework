import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Motivation } from './gamification-enums.dto';
import { OnboardingSurveyDto } from './onboarding-survey.dto';

export class UserPreferencesDto {
  @ApiProperty({ description: 'Dietary preference', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryPreference?: string[];

  @ApiProperty({ description: 'Food allergies', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ description: 'Preferred food categories', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @ApiProperty({
    description: 'Ingredients/allergens to exclude when filtering',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodExclusions?: string[];

  @ApiProperty({
    description: 'Primary motivation for using the app',
    required: false,
    enum: Object.values(Motivation),
  })
  @IsOptional()
  @IsEnum(Motivation)
  motivation?: Motivation;

  @ApiProperty({
    description: 'Daily time commitment in minutes (e.g. 5, 10, 15)',
    required: false,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyTimeCommitmentMinutes?: number;

  @ApiProperty({
    description: 'Whether to show Nutri-Score in the UI',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showNutriScore?: boolean;

  @ApiProperty({
    description: 'Whether to prefer avoiding ultra-processed foods',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  avoidUpf?: boolean;

  @ApiProperty({
    description:
      'Gamification onboarding habit baselines. Enum codes match GET /catalog/startup → data.onboarding.',
    required: false,
    type: OnboardingSurveyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingSurveyDto)
  onboardingSurvey?: OnboardingSurveyDto;
}
