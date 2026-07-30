import { Test, TestingModule } from '@nestjs/testing';
import { EventSource, EventType } from '../event-types';
import { ClientEventService } from './client-event.service';
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

  it('records an allowlisted app session event with APP source', async () => {
    userEventService.record.mockResolvedValue({
      event: {
        id: 'evt-1',
        userId: 'u1',
        eventType: EventType.APP_SESSION_OPENED,
        source: EventSource.APP,
        createdAt: new Date('2026-07-30T12:00:00Z'),
        metadata: {
          sessionId: 's1',
          subject: { type: 'USER', id: 'u1' },
        },
        groupId: null,
      },
      replayed: false,
    });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.APP_SESSION_OPENED,
      metadata: { sessionId: 's1' },
      idempotencyKey: 'app-session-opened:u1:s1',
    });

    expect(userEventService.record).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: EventType.APP_SESSION_OPENED,
      source: EventSource.APP,
      metadata: { sessionId: 's1' },
      idempotencyKey: 'app-session-opened:u1:s1',
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
    userEventService.record.mockResolvedValue({
      event: {
        id: 'evt-existing',
        userId: 'u1',
        eventType: EventType.APP_SESSION_ENDED,
        source: EventSource.APP,
        createdAt: new Date('2026-07-30T12:05:00Z'),
        metadata: { sessionId: 's1', durationSeconds: 300 },
        groupId: null,
      },
      replayed: true,
    });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.APP_SESSION_ENDED,
      metadata: { sessionId: 's1', durationSeconds: 300 },
      idempotencyKey: 'app-session-ended:u1:s1',
    });

    expect(result.replayed).toBe(true);
    expect(result.event.id).toBe('evt-existing');
  });
});
