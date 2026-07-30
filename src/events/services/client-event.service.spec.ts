import { Test, TestingModule } from '@nestjs/testing';
import { EventSource, EventType } from '../event-types';
import {
  buildClientEventIdempotencyKey,
  ClientEventService,
} from './client-event.service';
import { UserEventService } from './user-event.service';

describe('ClientEventService', () => {
  let service: ClientEventService;
  const userEventService = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientEventService,
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get(ClientEventService);
    jest.clearAllMocks();
  });

  it('builds a user-scoped idempotency key from eventType + userId + sessionId', () => {
    expect(
      buildClientEventIdempotencyKey(
        EventType.APP_SESSION_OPENED,
        'u1',
        '550e8400-e29b-41d4-a716-446655440000',
      ),
    ).toBe('APP_SESSION_OPENED:u1:550e8400-e29b-41d4-a716-446655440000');
  });

  it('records an allowlisted app session event with APP source', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    userEventService.record.mockResolvedValue({
      event: {
        id: 'evt-1',
        userId: 'u1',
        eventType: EventType.APP_SESSION_OPENED,
        source: EventSource.APP,
        createdAt: new Date('2026-07-30T12:00:00Z'),
        metadata: {
          sessionId,
          subject: { type: 'USER', id: 'u1' },
        },
        groupId: null,
      },
      replayed: false,
    });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.APP_SESSION_OPENED,
      metadata: { sessionId, platform: 'ios' },
    });

    expect(userEventService.record).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: EventType.APP_SESSION_OPENED,
      source: EventSource.APP,
      metadata: { sessionId, platform: 'ios' },
      idempotencyKey: `APP_SESSION_OPENED:u1:${sessionId}`,
      subject: { type: 'USER', id: 'u1' },
    });
    expect(result.replayed).toBe(false);
    expect(result.event).toEqual(
      expect.objectContaining({
        id: 'evt-1',
        eventType: EventType.APP_SESSION_OPENED,
        source: EventSource.APP,
        timestamp: new Date('2026-07-30T12:00:00Z'),
      }),
    );
  });

  it('returns replayed events without changing the DTO shape', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    userEventService.record.mockResolvedValue({
      event: {
        id: 'evt-existing',
        userId: 'u1',
        eventType: EventType.APP_SESSION_ENDED,
        source: EventSource.APP,
        createdAt: new Date('2026-07-30T12:05:00Z'),
        metadata: { sessionId, durationSeconds: 300 },
        groupId: null,
      },
      replayed: true,
    });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.APP_SESSION_ENDED,
      metadata: { sessionId, durationSeconds: 300 },
    });

    expect(userEventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `APP_SESSION_ENDED:u1:${sessionId}`,
      }),
    );
    expect(result.replayed).toBe(true);
    expect(result.event.id).toBe('evt-existing');
  });
});
