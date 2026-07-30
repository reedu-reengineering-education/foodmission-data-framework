import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { EventType } from '../event-types';
import { CreateClientEventDto } from '../dto/create-client-event.dto';
import { ClientEventService } from '../services/client-event.service';
import { EventsController } from './events.controller';

describe('EventsController', () => {
  let controller: EventsController;
  const clientEventService = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: ClientEventService, useValue: clientEventService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EventsController);
    jest.clearAllMocks();
  });

  it('delegates to ClientEventService and returns the event DTO', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';
    const dto: CreateClientEventDto = {
      eventType: EventType.APP_SESSION_OPENED,
      metadata: { sessionId, platform: 'ios' },
    };
    const eventDto = {
      id: 'evt-1',
      userId: 'u1',
      eventType: EventType.APP_SESSION_OPENED,
      source: 'app',
      timestamp: new Date(),
      metadata: { sessionId, platform: 'ios' },
      groupId: null,
    };
    clientEventService.record.mockResolvedValue({
      event: eventDto,
      replayed: false,
    });

    const result = await controller.create('u1', dto);

    expect(clientEventService.record).toHaveBeenCalledWith({
      userId: 'u1',
      eventType: dto.eventType,
      metadata: dto.metadata,
    });
    expect(result).toBe(eventDto);
  });
});
