import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateChallengeDto {
  @ApiProperty({
    description: 'Unique challenge code',
    example: 'CH.A1.1',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @ApiProperty({
    description: 'Dimension id',
    example: 'uuid-dimension-id',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  dimensionId: string;

  @ApiPropertyOptional({
    description: 'Optional topic id',
    example: 'uuid-topic-id',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @ApiProperty({
    description: 'Content difficulty level',
    enum: ContentLevel,
    example: ContentLevel.BEGINNER,
  })
  @IsEnum(ContentLevel)
  level: ContentLevel;

  @ApiProperty({
    description: 'The name of the challenge',
    example: 'Bring Your Own Bag',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'The task of the challenge',
    example: 'Use a reusable shopping bag for your groceries today',
  })
  @IsString()
  @IsNotEmpty()
  task: string;

  @ApiProperty({
    description: 'Why this challenge matters',
    example: 'Reusable bags cut plastic waste from everyday shopping',
  })
  @IsString()
  @IsNotEmpty()
  whyItMatters: string;

  @ApiPropertyOptional({
    description: 'Content tag codes (HEALTH, FOOD_CHOICE, FOOD_AND_WASTE)',
    example: ['FOOD_CHOICE', 'FOOD_AND_WASTE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the challenge relates to health',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  health?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the challenge relates to food choice',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  foodChoice?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the challenge relates to food waste',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  foodWaste?: boolean;

  @ApiProperty({
    description: 'Whether the challenge is currently available',
    example: true,
  })
  @IsBoolean()
  available: boolean;
}
