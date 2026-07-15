import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TransformTrimLowercaseToUndefined } from '../../common/decorators/transformers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../constants';

export class LangQueryDto {
  @ApiPropertyOptional({
    description: `Optional locale override for translated copy. Defaults to ${DEFAULT_LOCALE}.`,
    enum: SUPPORTED_LOCALES,
    example: 'de',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SUPPORTED_LOCALES])
  @TransformTrimLowercaseToUndefined()
  lang?: string;
}
