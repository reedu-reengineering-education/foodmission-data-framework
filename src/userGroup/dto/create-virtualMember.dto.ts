import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsObject,
} from 'class-validator';
import {
  Gender,
  ActivityLevel,
  AnnualIncomeLevel,
} from '@prisma/client';

export class CreateVirtualMemberDto {
  @ApiProperty({
    description: 'Nickname of the virtual member',
    example: 'Little Timmy',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nickname: string;

  @ApiProperty({
    description: 'Age of the virtual member',
    example: 8,
    required: false,
    minimum: 0,
    maximum: 150,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(150)
  age?: number;

  @ApiProperty({
    description: 'Gender of the virtual member',
    enum: Gender,
    required: false,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({
    description: 'Physical activity level',
    enum: ActivityLevel,
    required: false,
  })
  @IsEnum(ActivityLevel)
  @IsOptional()
  activityLevel?: ActivityLevel;

  @ApiProperty({
    description: 'Annual income level',
    enum: AnnualIncomeLevel,
    required: false,
  })
  @IsEnum(AnnualIncomeLevel)
  @IsOptional()
  annualIncome?: AnnualIncomeLevel;

  @ApiProperty({
    description: 'Free-form preferences (JSON)',
    example: { dietaryPreference: 'vegetarian' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  preferences?: Record<string, unknown>;
}
