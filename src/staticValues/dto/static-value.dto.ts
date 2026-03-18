import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class StaticValueDto {
  @ApiProperty({ description: 'Stable identifier/code for the value' })
  @Expose()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Human-readable label' })
  @Expose()
  @IsString()
  label: string;

  @ApiPropertyOptional({
    description: 'Optional metadata (e.g. countryCode for regions)',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  @IsOptional()
  meta?: Record<string, any>;
}
