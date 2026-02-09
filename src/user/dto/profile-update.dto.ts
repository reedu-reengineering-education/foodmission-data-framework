import { IsString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GenderLocal } from './create-user.dto';

export class ProfileUpdateDto {
  @ApiProperty({ description: 'Unique username', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Age in years', required: false })
  @IsOptional()
  @IsNumber()
  age?: number;

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
  @ApiProperty({ description: 'Gender', required: false, enum: Object.values(GenderLocal) })
  @IsOptional()
  @IsEnum(GenderLocal)
  gender?: GenderLocal | null;

  @ApiProperty({ description: 'Annual income', required: false })
  @IsOptional()
  @IsNumber()
  annualIncome?: number;

  @ApiProperty({ description: 'Education level', required: false })
  @IsOptional()
  @IsString()
  educationLevel?: string;

  @ApiProperty({ description: 'Weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiProperty({ description: 'Height in cm', required: false })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiProperty({ description: 'Activity level', required: false })
  @IsOptional()
  @IsString()
  activityLevel?: string;

  @ApiProperty({ description: 'Health goals (JSON)', required: false })
  @IsOptional()
  @IsObject()
  healthGoals?: Record<string, any>;

  @ApiProperty({ description: 'Nutrition targets (JSON)', required: false })
  @IsOptional()
  @IsObject()
  nutritionTargets?: Record<string, any>;
}
