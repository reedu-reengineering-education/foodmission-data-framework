import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel, QuestContentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuestItemDto {
  @ApiProperty({
    enum: QuestContentType,
    example: QuestContentType.MISSION,
    description: 'Referenced content type',
  })
  @IsEnum(QuestContentType)
  contentType: QuestContentType;

  @ApiProperty({
    example: 'M.A1.1',
    description: 'Business code of the referenced content',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  contentCode: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Display order within the quest (defaults to array index)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateQuestDto {
  @ApiProperty({
    description: 'Unique quest code',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
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

  @ApiProperty({
    description: 'Content difficulty level',
    enum: ContentLevel,
    example: ContentLevel.BEGINNER,
  })
  @IsEnum(ContentLevel)
  level: ContentLevel;

  @ApiPropertyOptional({
    description: 'Quest name',
    example: 'Learn to Log Your Food',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Quest title',
    example: 'Diet changes — Beginner',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Quest description',
    example: 'Beginner quest for more sustainable diet changes.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the quest is currently available',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({
    type: [CreateQuestItemDto],
    description:
      'Ordered quest items (missions, challenges, facts, quizzes, …)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestItemDto)
  items: CreateQuestItemDto[];
}
