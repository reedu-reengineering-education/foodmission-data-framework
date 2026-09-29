import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CONSENT_FORM_COUNTRY_CODES } from '../catalog.constants';

export class ConsentFormDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code of the pilot',
    enum: CONSENT_FORM_COUNTRY_CODES,
    example: 'no',
  })
  @Expose()
  countryCode!: string;

  @ApiProperty({
    description:
      'Language of `content`: the requested locale when the pilot has a form in it, otherwise the English fallback',
    example: 'no',
  })
  @Expose()
  language!: string;

  @ApiProperty({
    description:
      'Languages this pilot has a consent form in; always includes `en`',
    type: [String],
    example: ['en', 'no'],
  })
  @Expose()
  availableLanguages!: string[];

  @ApiProperty({
    description:
      'Information letter and consent form for the pilot, as Markdown',
    example:
      '# Do you want to participate in the FOODMISSION Pilot Phase?\n...',
  })
  @Expose()
  content!: string;
}

export class ConsentFormResponseDto {
  @ApiProperty({ type: ConsentFormDto })
  @Expose()
  @Type(() => ConsentFormDto)
  data!: ConsentFormDto;
}
