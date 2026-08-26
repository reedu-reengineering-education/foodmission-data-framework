import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClientEventDto } from './create-client-event.dto';
import { EventType } from '../event-types';

describe('CreateClientEventDto', () => {
  it('rejects an APP_SESSION_OPENED event with no metadata', async () => {
    const dto = plainToInstance(CreateClientEventDto, {
      eventType: EventType.APP_SESSION_OPENED,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('metadata');
  });

  it('rejects an APP_SESSION_OPENED event with a non-UUID sessionId', async () => {
    const dto = plainToInstance(CreateClientEventDto, {
      eventType: EventType.APP_SESSION_OPENED,
      metadata: { sessionId: 'not-a-uuid' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('metadata');
  });

  it('accepts an APP_SESSION_ENDED event with a valid UUID sessionId', async () => {
    const dto = plainToInstance(CreateClientEventDto, {
      eventType: EventType.APP_SESSION_ENDED,
      metadata: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts a behavioural event with no metadata', async () => {
    const dto = plainToInstance(CreateClientEventDto, {
      eventType: EventType.MEAL_MEAT_FREE,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts a behavioural event with freeform metadata', async () => {
    const dto = plainToInstance(CreateClientEventDto, {
      eventType: EventType.MEAL_MEAT_FREE,
      metadata: { productId: 'abc', barcode: '123' },
      idempotencyKey: 'meal-meat-free-2026-08-20',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
