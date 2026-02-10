import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Local enum used for validation and OpenAPI docs. Keep it in sync with Prisma schema.
export enum GenderLocal {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  UNSPECIFIED = 'UNSPECIFIED',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

// Mirror Prisma enums for validation and OpenAPI docs
export enum ActivityLevel {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  ACTIVE = 'ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE',
}

export enum AnnualIncomeLevel {
  BELOW_10000 = 'BELOW_10000',
  FROM_10000_TO_19999 = 'FROM_10000_TO_19999',
  FROM_20000_TO_34999 = 'FROM_20000_TO_34999',
  FROM_35000_TO_49999 = 'FROM_35000_TO_49999',
  FROM_50000_TO_74999 = 'FROM_50000_TO_74999',
  FROM_75000_TO_99999 = 'FROM_75000_TO_99999',
  ABOVE_100000 = 'ABOVE_100000',
}

export enum EducationLevel {
  NO_FORMAL_EDUCATION = 'NO_FORMAL_EDUCATION',
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  VOCATIONAL = 'VOCATIONAL',
  BACHELORS = 'BACHELORS',
  MASTERS = 'MASTERS',
  DOCTORATE = 'DOCTORATE',
}

export class CreateUserDto {
  @ApiProperty({ description: 'Keycloak user ID' })
  @IsString()
  @IsNotEmpty()
  keycloakId: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'User preferences', required: false })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @ApiProperty({ description: 'User settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  // Basic profile (mandatory at registration - some may be set later by client flows)
  @ApiProperty({ description: 'Unique username', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Year of birth (YYYY)', required: false })
  @IsOptional()
  @IsNumber()
  yearOfBirth?: number; // Persisted as yearOfBirth (Int) in DB

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

  // Extended profile (optional)
  @ApiProperty({
    description: 'Gender',
    required: false,
    enum: Object.values(GenderLocal),
  })
  @IsOptional()
  @IsEnum(GenderLocal)
  gender?: GenderLocal | null;

  @ApiProperty({ description: 'Annual income (optional)', required: false })
  @IsOptional()
  @IsEnum(AnnualIncomeLevel)
  annualIncome?: AnnualIncomeLevel;

  @ApiProperty({ description: 'Education level', required: false })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiProperty({ description: 'Weight in kg', required: false })
  @IsOptional()
  weightKg?: number;

  @ApiProperty({ description: 'Height in cm', required: false })
  @IsOptional()
  heightCm?: number;

  @ApiProperty({
    description: 'Activity level (e.g., low, medium, high)',
    required: false,
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
