import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { IsOptionalNotNull } from '../../common/decorators/optional-not-null.decorator';

export class UpdateMissionsDto {
  @ApiPropertyOptional({ description: 'Dimension id', format: 'uuid' })
  @IsOptionalNotNull()
  @IsUUID()
  dimensionId?: string;

  @ApiPropertyOptional({
    description: 'Topic id, or null to clear the topic',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  topicId?: string | null;

  @ApiPropertyOptional({
    description: 'Content difficulty level',
    enum: ContentLevel,
  })
  @IsOptionalNotNull()
  @IsEnum(ContentLevel)
  level?: ContentLevel;

  @ApiPropertyOptional({
    description: 'The name of the mission',
    example: 'Plastic-Free Week',
    maxLength: 255,
  })
  @IsOptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Expected duration',
    example: '1 week',
    maxLength: 64,
  })
  @IsOptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  duration?: string;

  @ApiPropertyOptional({
    description: 'The goal of the mission',
    example: 'Avoid single-use plastics for one week',
  })
  @IsOptionalNotNull()
  @IsString()
  @IsNotEmpty()
  goal?: string;

  @ApiPropertyOptional({
    description: 'Why this mission matters',
    example: 'Reducing plastic waste protects oceans and wildlife',
  })
  @IsOptionalNotNull()
  @IsString()
  @IsNotEmpty()
  whyItMatters?: string;

  @ApiPropertyOptional({
    description: 'Whether the mission relates to health',
    example: false,
  })
  @IsOptionalNotNull()
  @IsBoolean()
  health?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the mission relates to food choice',
    example: true,
  })
  @IsOptionalNotNull()
  @IsBoolean()
  foodChoice?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the mission relates to food waste',
    example: false,
  })
  @IsOptionalNotNull()
  @IsBoolean()
  foodWaste?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the mission is currently available',
    example: true,
  })
  @IsOptionalNotNull()
  @IsBoolean()
  available?: boolean;
}
