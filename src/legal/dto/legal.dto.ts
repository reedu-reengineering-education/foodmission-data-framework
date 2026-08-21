import { LegalDocType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class LegalLocaleQueryDto {
  @ApiPropertyOptional({
    description:
      'Preferred locale (e.g. en, de). Falls back to en when unavailable.',
    example: 'de',
  })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class LegalDocumentParamsDto {
  @ApiProperty({ enum: LegalDocType })
  @IsEnum(LegalDocType)
  docType!: LegalDocType;
}

export class LegalDocumentResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty({ enum: LegalDocType })
  docType!: LegalDocType;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  updatedAt!: Date;
}

export class PendingLegalConsentDto {
  @ApiProperty({ enum: LegalDocType })
  docType!: LegalDocType;

  @ApiProperty({
    description: 'Stable document key: <DOC_TYPE>:<VERSION>:<LOCALE>',
  })
  documentKey!: string;

  @ApiProperty()
  requiredVersion!: string;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  accepted!: boolean;

  @ApiPropertyOptional()
  acceptedVersion?: string;

  @ApiPropertyOptional()
  acceptedAt?: Date;
}

export class LegalConsentStatusResponseDto {
  @ApiProperty()
  mustAccept!: boolean;

  @ApiProperty({ type: [PendingLegalConsentDto] })
  documents!: PendingLegalConsentDto[];
}

export class AcceptLegalConsentDto {
  @ApiProperty({
    description: 'Document key returned by legal status endpoint',
  })
  @IsString()
  documentKey!: string;
}

export class AcceptLegalConsentResponseDto {
  @ApiProperty()
  accepted!: boolean;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  documentKey!: string;

  @ApiProperty({ enum: LegalDocType })
  docType!: LegalDocType;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  acceptedAt!: Date;
}
