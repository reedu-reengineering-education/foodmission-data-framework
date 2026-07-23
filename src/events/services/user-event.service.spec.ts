import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventSource, EventType } from '../event-types';
import { UserEventService } from './user-event.service';

describe('UserEventService', () => {
  let service: UserEventService;
  let prisma: {
    userEvent: { findUnique: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      userEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserEventService);
  });

  it('records a new event', async () => {
    prisma.userEvent.findUnique.mockResolvedValue(null);
    prisma.userEvent.create.mockResolvedValue({
      id: 'evt-1',
      userId: 'u1',
      eventType: EventType.ONBOARDING_COMPLETED,
      source: EventSource.ONBOARDING,
    });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.ONBOARDING_COMPLETED,
      source: EventSource.ONBOARDING,
      metadata: { segment: 'BEGINNER' },
      subject: { type: 'USER', id: 'u1' },
    });

    expect(result.replayed).toBe(false);
    expect(prisma.userEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: EventSource.ONBOARDING,
          metadata: expect.objectContaining({
            segment: 'BEGINNER',
            subject: { type: 'USER', id: 'u1' },
          }),
        }),
      }),
    );
  });

  it('replays on idempotencyKey', async () => {
    prisma.userEvent.findUnique.mockResolvedValue({ id: 'evt-existing' });

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.POINTS_AWARDED,
      source: EventSource.WALLET,
      idempotencyKey: 'key-1',
    });

    expect(result.replayed).toBe(true);
    expect(prisma.userEvent.create).not.toHaveBeenCalled();
  });

  it('replays on P2002 race', async () => {
    prisma.userEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'evt-race' });
    prisma.userEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.record({
      userId: 'u1',
      eventType: EventType.POINTS_AWARDED,
      source: EventSource.WALLET,
      idempotencyKey: 'key-race',
    });

    expect(result.replayed).toBe(true);
    expect(result.event.id).toBe('evt-race');
  });
});
