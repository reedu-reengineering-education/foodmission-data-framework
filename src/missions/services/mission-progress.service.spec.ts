import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MissionProgressService } from './mission-progress.service';
import { MissionProgressRepository } from '../repositories/mission-progress.repository';
import { TranslationService } from '../../translations/services/translation.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

describe('MissionProgressService', () => {
  let service: MissionProgressService;
  let repository: MissionProgressRepository;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;

  beforeEach(async () => {
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionProgressService,
        {
          provide: MissionProgressRepository,
          useValue: {
            findMissionByCodeOrId: jest.fn(),
            findByUserIdAndMissionId: jest.fn(),
            findAllByUserId: jest.fn(),
            findAllPaginated: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
            resolveMany: jest.fn(),
          },
        },
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get<MissionProgressService>(MissionProgressService);
    repository = module.get<MissionProgressRepository>(
      MissionProgressRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMissionById', () => {
    it('should return mission progress if found', async () => {
      const progress = {
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        mission: { title: 'Test Mission' },
      };
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
        progress,
      );
      const result = await service.getMissionById('m1', 'u1');
      expect(result).toEqual({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        missionTitle: 'Test Mission',
      });
    });

    it('should return default progress when mission exists but no row yet', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
        null,
      );
      const result = await service.getMissionById('m1', 'u1');
      expect(result).toEqual({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 0,
        missionTitle: 'Test Mission',
      });
    });

    it('should throw NotFoundException if mission does not exist', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue(null);
      await expect(service.getMissionById('m1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMissionById('m1', 'u1')).rejects.toThrow(
        'Mission not found',
      );
    });
  });

  describe('getAllMissionsByUserId', () => {
    it('should return all mission progresses for user', async () => {
      const progresses = [
        {
          missionId: 'm1',
          userId: 'u1',
          completed: false,
          progress: 0.5,
          mission: { title: 'Test Mission 1' },
        },
        {
          missionId: 'm2',
          userId: 'u1',
          completed: true,
          progress: 1,
          mission: { title: 'Test Mission 2' },
        },
      ];
      (repository.findAllByUserId as jest.Mock).mockResolvedValue(progresses);
      const result = await service.getAllMissionsByUserId('u1');
      expect(result).toEqual([
        {
          missionId: 'm1',
          userId: 'u1',
          completed: false,
          progress: 0.5,
          missionTitle: 'Test Mission 1',
        },
        {
          missionId: 'm2',
          userId: 'u1',
          completed: true,
          progress: 1,
          missionTitle: 'Test Mission 2',
        },
      ]);
    });
  });

  describe('update', () => {
    it('should upsert and return mission progress', async () => {
      const updated = {
        missionId: 'm1',
        userId: 'u1',
        completed: true,
        progress: 1,
        mission: { title: 'Test Mission' },
      };
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue(updated);
      const result = await service.update(
        'm1',
        { completed: true, progress: 1 },
        'u1',
      );
      expect(repository.upsert).toHaveBeenCalledWith('u1', 'm1', {
        completed: true,
        progress: 1,
      });
      expect(result).toEqual({
        missionId: 'm1',
        userId: 'u1',
        completed: true,
        progress: 1,
        missionTitle: 'Test Mission',
      });
    });

    it('resolves a mission code and upserts by id', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 10,
        mission: { title: 'Test Mission' },
      });

      await service.update('M.A1.1', { progress: 10 }, 'u1');

      expect(repository.findMissionByCodeOrId).toHaveBeenCalledWith('M.A1.1');
      expect(repository.upsert).toHaveBeenCalledWith('u1', 'm1', {
        progress: 10,
      });
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            missionId: 'm1',
            missionCode: 'M.A1.1',
          }),
          idempotencyKey: 'mission-started:u1:m1',
        }),
      );
    });

    it('emits MISSION_STARTED on first active progress', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 10,
        mission: { title: 'Test Mission' },
      });

      await service.update('m1', { progress: 10 }, 'u1');

      expect(userEventService.record).toHaveBeenCalledTimes(1);
      expect(userEventService.record).toHaveBeenCalledWith({
        userId: 'u1',
        eventType: EventType.MISSION_STARTED,
        source: EventSource.MISSION,
        metadata: {
          missionId: 'm1',
          missionCode: 'M.A1.1',
          source: EventSource.API,
          body: { progress: 10 },
        },
        idempotencyKey: 'mission-started:u1:m1',
      });
    });

    it('emits MISSION_UPDATED when progress changes after start', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 10,
      });
      (repository.upsert as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 40,
        mission: { title: 'Test Mission' },
      });

      await service.update('m1', { progress: 40 }, 'u1');

      expect(userEventService.record).toHaveBeenCalledTimes(1);
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.MISSION_UPDATED,
          idempotencyKey: 'mission-updated:u1:m1:40:false',
          metadata: expect.objectContaining({
            body: { progress: 40 },
          }),
        }),
      );
    });

    it('emits UPDATED and COMPLETED when completing an in-progress mission', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 40,
      });
      (repository.upsert as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: true,
        progress: 100,
        mission: { title: 'Test Mission' },
      });

      await service.update(
        'm1',
        { completed: true, progress: 100 },
        'u1',
      );

      expect(userEventService.record).toHaveBeenCalledTimes(2);
      expect(userEventService.record.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.MISSION_UPDATED,
        }),
      );
      expect(userEventService.record.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.MISSION_COMPLETED,
          idempotencyKey: 'mission-completed:u1:m1',
        }),
      );
    });

    it('does not emit on a zero-progress create or completed retry', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 0,
        mission: { title: 'Test Mission' },
      });

      await service.update('m1', { progress: 0 }, 'u1');
      expect(userEventService.record).not.toHaveBeenCalled();

      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: true,
        progress: 100,
      });
      (repository.upsert as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: true,
        progress: 100,
        mission: { title: 'Test Mission' },
      });

      await service.update('m1', { completed: true, progress: 100 }, 'u1');
      expect(userEventService.record).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if mission does not exist', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('m1', { completed: true }, 'u1'),
      ).rejects.toThrow('Mission not found');
    });
  });
});
