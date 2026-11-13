import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  TransformCSVToStringArray,
  TransformTrimLowercaseToUndefined,
  TransformTrimToUndefined,
} from '../../common/decorators/transformers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Allergens, RecipeOrigin } from '@prisma/client';

export class QueryRecipeDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Chicken',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by cuisine type',
    example: 'Italian',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  cuisineType?: string;

  @ApiPropertyOptional({
    description: 'Filter public recipes only',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by dietary labels',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformCSVToStringArray()
  dietaryLabels?: string[];

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformCSVToStringArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by allergens',
    enum: Allergens,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Allergens, { each: true })
  @TransformCSVToStringArray()
  allergens?: Allergens[];

  @ApiPropertyOptional({
    description: 'Filter by recipe origin',
    enum: RecipeOrigin,
  })
  @IsOptional()
  @IsEnum(RecipeOrigin)
  @TransformTrimToUndefined()
  origin?: RecipeOrigin;

  @ApiPropertyOptional({ description: 'Difficulty label' })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  difficulty?: string;

  @ApiPropertyOptional({
    description:
      'Words to search for, separated by spaces or punctuation; at most 8 are used. ' +
      'Every word must match a word in the title or in an ingredient (its name, or its food name in `lang`), in any order: ' +
      'its start ("chick" finds "Chicken") or a form with a different ending ("pie" finds "pies", "pomodoro" finds "pomodori"). ' +
      'Results are ordered by relevance: more words in the title first (so title matches before ingredient-only ones), ' +
      'then shorter titles. Only the 100 newest matching recipes are ranked; use more words to narrow the search.',
    example: 'chicken curry',
  })
  @IsOptional()
  @IsString()
  @TransformTrimToUndefined()
  search?: string;

  @ApiPropertyOptional({
    description: `Locale for ingredient names linked to NEVO generic foods, and for searching them (see \`search\`). Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimLowercaseToUndefined()
  lang?: string;
}
