import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CLIENT_RECORDABLE_EVENT_TYPES,
  ClientRecordableEventType,
} from '../event-types';

/** Context for client-allowlisted app session events. */
export class ClientEventMetadataDto {
  @ApiProperty({
    description: 'Client-generated session id (required for idempotency)',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  sessionId!: string;

  @ApiPropertyOptional({
    description: 'Client platform (e.g. ios, android, web)',
    example: 'ios',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  platform?: string;

  @ApiPropertyOptional({
    description: 'Client app version',
    example: '1.2.3',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @ApiPropertyOptional({
    description:
      'Foreground duration in seconds (informational; not server-validated)',
    example: 420,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

export class CreateClientEventDto {
  @ApiProperty({
    description: 'Allowlisted client event type',
    enum: CLIENT_RECORDABLE_EVENT_TYPES,
    example: 'APP_SESSION_OPENED',
  })
  @IsIn([...CLIENT_RECORDABLE_EVENT_TYPES])
  eventType!: ClientRecordableEventType;

  @ApiProperty({
    description:
      'Event context. sessionId is required; the server builds the idempotency key.',
    type: ClientEventMetadataDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ClientEventMetadataDto)
  metadata!: ClientEventMetadataDto;
}
