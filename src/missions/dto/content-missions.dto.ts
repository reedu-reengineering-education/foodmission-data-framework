import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class MissionsContentDto {
  @ApiProperty({
    description: 'Unique mission code',
    example: 'M.A1.1',
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
    description: 'The title of the mission',
    example: 'Plastic-Free Week',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Expected duration',
    example: '1 week',
  })
  @IsString()
  @IsNotEmpty()
  duration: string;

  @ApiProperty({
    description: 'Goal of the mission',
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

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  health?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  foodChoice?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  foodWaste?: boolean;

  @ApiProperty({
    description: 'Whether the mission is available to users',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  available?: boolean;
}
