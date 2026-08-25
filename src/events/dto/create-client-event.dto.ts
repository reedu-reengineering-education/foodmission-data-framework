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
    description:
      'Event type to record. Includes app session and all behavioural/observational ' +
      'types. Trust-sensitive types (wallet, progress, achievements) are server-only.',
    enum: CLIENT_RECORDABLE_EVENT_TYPES,
    example: 'MEAL_MEAT_FREE',
  })
  @IsIn([...CLIENT_RECORDABLE_EVENT_TYPES])
  eventType!: ClientRecordableEventType;

  @ApiPropertyOptional({
    description:
      'Optional context payload (e.g. sessionId for app-session events, ' +
      'productId/barcode/score for behavioural events). ' +
      'For APP_SESSION_* events include sessionId (UUID) so the server can build ' +
      'a stable idempotency key.',
    type: 'object',
    additionalProperties: true,
    example: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Optional client-supplied idempotency key for behavioural events. ' +
      'The server namespaces it by userId to prevent cross-user collisions. ' +
      'For APP_SESSION_* events use metadata.sessionId instead.',
    example: 'meal-meat-free-2026-08-20',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
