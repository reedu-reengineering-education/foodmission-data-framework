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
} from 'class-validator';

export class ChallengesContentDto {
  @ApiProperty({
    description: 'Unique challenge code',
    example: 'CH.A1.1',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Dimension id',
    example: 'uuid-dimension-id',
  })
  @IsUUID()
  @IsNotEmpty()
  dimensionId: string;

  @ApiPropertyOptional({
    description: 'Optional topic id',
    example: 'uuid-topic-id',
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
    description: 'The title of the challenge',
    example: 'Bring Your Own Bag',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Task of the challenge',
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
    description: 'Content tag codes',
    example: ['FOOD_CHOICE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Whether the challenge is available to users',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  available?: boolean;
}
