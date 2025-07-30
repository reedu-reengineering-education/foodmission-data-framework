import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserPreferencesDto {
  @ApiProperty({ description: 'Dietary restrictions', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

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
}