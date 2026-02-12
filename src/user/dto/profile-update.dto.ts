import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  IsInt,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  GenderLocal,
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from './create-user.dto';

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
  healthGoals?: Record<string, any>;

  @ApiProperty({ description: 'Nutrition targets (JSON)', required: false })
  @IsOptional()
  @IsObject()
  nutritionTargets?: Record<string, any>;
}
