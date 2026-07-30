import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { TransformTrimLowercaseToUndefined } from '../../common/decorators/transformers';

const FORM_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Stored under User.settings.consents[formKey]. */
export type StoredUserConsent = {
  acceptedAt: string;
  locale: string;
};

export class ConsentQueryDto {
  @ApiPropertyOptional({
    description: `Optional locale for translated title/body. Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimLowercaseToUndefined()
  lang?: string;
}

export class ConsentFormDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'privacy_notice' })
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  required: boolean;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateConsentFormDto {
  @ApiProperty({
    example: 'privacy_notice',
    description: 'Stable slug (lowercase letters, digits, underscores)',
  })
  @IsString()
  @Matches(FORM_KEY_PATTERN, {
    message:
      'key must start with a letter and contain only lowercase letters, digits, and underscores',
  })
  key: string;

  @ApiProperty({ example: 'Privacy Notice' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ example: 'Privacy Notice' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'We collect and process your data as follows…' })
  @IsString()
  @MinLength(1)
  body: string;
}

export class UpdateConsentFormDto {
  @ApiPropertyOptional({ example: 'Privacy Notice' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;
}

export class AcceptConsentDto {
  @ApiProperty({ example: 'privacy_notice' })
  @IsString()
  @MinLength(1)
  formKey: string;
}

export class UserConsentStatusDto {
  @ApiProperty({ example: 'privacy_notice' })
  formKey: string;

  @ApiProperty()
  required: boolean;

  @ApiProperty()
  accepted: boolean;

  @ApiPropertyOptional()
  acceptedAt?: string;

  @ApiPropertyOptional({ example: 'de' })
  locale?: string;
}

export class UserConsentDto {
  @ApiProperty({ example: 'privacy_notice' })
  formKey: string;

  @ApiProperty({ example: 'de' })
  locale: string;

  @ApiProperty()
  acceptedAt: string;
}
