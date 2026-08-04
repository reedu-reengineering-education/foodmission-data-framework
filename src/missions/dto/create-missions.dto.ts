import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMissionsDto {
  @ApiProperty({
    description: 'Unique mission code',
    example: 'M.B1.1',
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
    description: 'The name of the mission',
    example: 'Plastic-Free Week',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Expected duration',
    example: '1 week',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  duration: string;

  @ApiProperty({
    description: 'The goal of the mission',
    example: 'Avoid single-use plastics for one week',
  })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({
    description: 'Why this mission matters',
    example: 'Reducing plastic waste protects oceans and wildlife',
  })
  @IsString()
  @IsNotEmpty()
  whyItMatters: string;

  @ApiPropertyOptional({
    description: 'Whether the mission relates to health',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  health?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the mission relates to food choice',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  foodChoice?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the mission relates to food waste',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  foodWaste?: boolean;

  @ApiProperty({
    description: 'Whether the mission is currently available',
    example: true,
  })
  @IsBoolean()
  available: boolean;
}
