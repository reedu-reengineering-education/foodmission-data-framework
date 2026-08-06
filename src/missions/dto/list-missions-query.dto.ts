import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ContentLevel } from '@prisma/client';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import {
  TransformBooleanString,
  TransformTrimLowercaseToUndefined,
  TransformTrimToUndefined,
} from '../../common/decorators/transformers';

export class ListMissionsQueryDto {
  @ApiPropertyOptional({
    description: `Optional locale for translated title/goal/whyItMatters. Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimLowercaseToUndefined()
  lang?: string;

  @ApiPropertyOptional({
    description: 'Filter by dimension code (e.g. DIET_CHANGES)',
    example: 'DIET_CHANGES',
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

  @ApiPropertyOptional({
    description:
      'Filter by availability. Defaults to true for non-admin users.',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  available?: boolean;
}
