import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CLIENT_RECORDABLE_EVENT_TYPES,
  ClientRecordableEventType,
} from '../event-types';

export class CreateClientEventDto {
  @ApiProperty({
    description: 'Allowlisted client event type',
    enum: CLIENT_RECORDABLE_EVENT_TYPES,
    example: 'APP_SESSION_OPENED',
  })
  @IsIn([...CLIENT_RECORDABLE_EVENT_TYPES])
  eventType!: ClientRecordableEventType;

  @ApiPropertyOptional({
    description:
      'Event context (e.g. sessionId, platform, appVersion, durationSeconds). ' +
      'Do not encode the event kind here.',
    type: 'object',
    additionalProperties: true,
    example: { sessionId: '550e8400-e29b-41d4-a716-446655440000', platform: 'ios' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Stable unique key so retries do not double-write. ' +
      'Suggested: app-session-opened:{userId}:{sessionId}',
    example: 'app-session-opened:user-id:session-id',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
