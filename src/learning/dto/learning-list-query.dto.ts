import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ContentLevel } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  TransformBooleanString,
  TransformTrimToUndefined,
} from '../../common/decorators/transformers';
import { LearningLangQueryDto } from './learning-lang-query.dto';
import { IntersectionType } from '@nestjs/swagger';

/** Shared filters for paginated catalog content lists. */
export class LearningContentFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by dimension code',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  dimensionCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by topic code',
    example: 'B1',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  topicCode?: string;

  @ApiPropertyOptional({
    description: 'Content difficulty level',
    enum: ContentLevel,
  })
  @IsOptional()
  @IsEnum(ContentLevel)
  level?: ContentLevel;

  @ApiPropertyOptional({ description: 'Filter by health tag', type: Boolean })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  health?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by food choice tag',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  foodChoice?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by food waste tag',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  foodWaste?: boolean;

  @ApiPropertyOptional({
    description: 'Search in primary text field (body/question/title)',
    example: 'plastic',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  search?: string;
}

export class LearningPaginatedQueryDto extends IntersectionType(
  PaginationQueryDto,
  LearningLangQueryDto,
  LearningContentFiltersDto,
) {}

export class LearningQuestListQueryDto extends IntersectionType(
  LearningLangQueryDto,
) {
  @ApiPropertyOptional({
    description: 'Filter by dimension code',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  dimensionCode?: string;

  @ApiPropertyOptional({
    description: 'Content difficulty level',
    enum: ContentLevel,
  })
  @IsOptional()
  @IsEnum(ContentLevel)
  level?: ContentLevel;
}
