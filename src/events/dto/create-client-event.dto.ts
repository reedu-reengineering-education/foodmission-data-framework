import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  isUUID,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  CLIENT_RECORDABLE_EVENT_TYPES,
  ClientRecordableEventType,
  isAppSessionEventType,
} from '../event-types';

/**
 * `metadata` is a freeform bag for behavioural events, but APP_SESSION_* events
 * need a UUID `sessionId` so the server can build a stable idempotency key
 * (`buildClientEventIdempotencyKey`) — enforced here since the shape depends
 * on the sibling `eventType` field.
 */
function IsValidClientEventMetadata(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidClientEventMetadata',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value !== undefined) {
            if (typeof value !== 'object' || value === null) return false;
          }
          const eventType = (args.object as CreateClientEventDto).eventType;
          if (!isAppSessionEventType(eventType)) return true;
          const sessionId = (value as { sessionId?: unknown } | undefined)
            ?.sessionId;
          return typeof sessionId === 'string' && isUUID(sessionId);
        },
        defaultMessage(): string {
          return 'metadata.sessionId (UUID) is required for APP_SESSION_* events';
        },
      },
    });
  };
}

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
  @IsValidClientEventMetadata()
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
