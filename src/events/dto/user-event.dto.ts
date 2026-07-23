import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({
    description:
      'What happened — catalog value from EventType (e.g. MEAL_LOGGED, POINTS_AWARDED).',
    example: 'POINTS_AWARDED',
  })
  eventType!: string;

  @ApiProperty({
    description:
      'Producing feature/channel — catalog value from EventSource (e.g. wallet, meal_log).',
    example: 'wallet',
  })
  source!: string;

  @ApiProperty({ description: 'When the event occurred' })
  timestamp!: Date;

  @ApiProperty({
    description:
      'Event context. Often includes subject `{ type, id }` plus family-specific fields ' +
      '(e.g. currency/amount/reason for wallet, mealId for meals). See event-types.ts.',
    type: 'object',
    additionalProperties: true,
    example: {
      currency: 'POINTS',
      amount: 10,
      reason: 'onboarding',
      subject: { type: 'USER', id: 'user-id' },
    },
  })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Optional group scope for the event',
  })
  groupId?: string | null;
}
