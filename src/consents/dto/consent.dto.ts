import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { TransformTrimLowercaseToUndefined } from '../../common/decorators/transformers';

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
