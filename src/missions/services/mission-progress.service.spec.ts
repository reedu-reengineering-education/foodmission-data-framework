import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MissionProgressService } from './mission-progress.service';
import { MissionProgressRepository } from '../repositories/mission-progress.repository';
import { TranslationService } from '../../translations/services/translation.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { GamificationWalletService } from '../../gamification/services/gamification-wallet.service';
import { CompletionRewardService } from '../../gamification/services/completion-reward.service';
import { RewardSourceType, WalletCurrency } from '@prisma/client';

describe('MissionProgressService', () => {
  let service: MissionProgressService;
  let repository: MissionProgressRepository;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;
  let walletService: jest.Mocked<Pick<GamificationWalletService, 'award'>>;

  beforeEach(async () => {
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    walletService = {
      award: jest.fn().mockResolvedValue({ replayed: false }),
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
            restart: jest.fn(),
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
        // Real CompletionRewardService over a mocked wallet, so these assertions keep
        // covering the actual xp/points award mechanics.
        CompletionRewardService,
        { provide: GamificationWalletService, useValue: walletService },
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
        startedAt: new Date('2026-09-30T08:15:00.000Z'),
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
        status: 'NOT_STARTED',
        missionTitle: 'Test Mission',
        startedAt: new Date('2026-09-30T08:15:00.000Z'),
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
        status: 'NOT_STARTED',
        missionTitle: 'Test Mission',
        startedAt: null,
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
          startedAt: new Date('2026-09-30T08:15:00.000Z'),
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
          status: 'NOT_STARTED',
          missionTitle: 'Test Mission 1',
          startedAt: new Date('2026-09-30T08:15:00.000Z'),
        },
        {
          missionId: 'm2',
          userId: 'u1',
          completed: true,
          progress: 1,
          status: 'NOT_STARTED',
          missionTitle: 'Test Mission 2',
          startedAt: null,
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
        status: 'NOT_STARTED',
        missionTitle: 'Test Mission',
        startedAt: null,
        reward: null,
      });
    });

    it('awards the mission reward on first completion', async () => {
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
        reward: { id: 'r1', xp: 15, points: 20 },
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

      expect(walletService.award).toHaveBeenCalledTimes(2);
      expect(walletService.award).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          rewardId: 'r1',
          sourceType: RewardSourceType.MISSION,
          sourceId: 'm1',
          currency: WalletCurrency.XP,
          amount: 15,
        }),
      );
      expect(walletService.award).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: WalletCurrency.POINTS,
          amount: 20,
        }),
      );
      expect(result.reward).toEqual({ xp: 15, points: 20 });
    });

    it('does not award the reward when the mission was already completed', async () => {
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
        reward: { id: 'r1', xp: 15, points: 20 },
      });
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: true,
        progress: 1,
      });
      (repository.upsert as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('m1', { completed: true }, 'u1');

      expect(walletService.award).not.toHaveBeenCalled();
      expect(result.reward).toBeNull();
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

      await service.update('m1', { completed: true, progress: 100 }, 'u1');

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

    describe('giving up', () => {
      const catalogRow = {
        id: 'm1',
        code: 'M.A1.1',
        title: 'Test Mission',
        reward: { id: 'r1', xp: 15, points: 20 },
      };
      const failedRow = {
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 40,
        status: 'FAILED',
        startedAt: new Date('2026-09-30T08:00:00.000Z'),
        mission: { title: 'Test Mission' },
      };

      beforeEach(() => {
        (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue(
          catalogRow,
        );
      });

      it('marks the mission FAILED and records MISSION_FAILED once, without a reward', async () => {
        (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
          ...failedRow,
          status: 'IN_PROGRESS',
        });
        (repository.upsert as jest.Mock).mockResolvedValue(failedRow);

        const result = await service.update('m1', { failed: true }, 'u1');

        expect(repository.upsert).toHaveBeenCalledWith('u1', 'm1', {
          failed: true,
        });
        expect(result.status).toBe('FAILED');
        expect(result.reward).toBeNull();
        expect(userEventService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: EventType.MISSION_FAILED,
            idempotencyKey: `mission-failed:u1:m1:${failedRow.startedAt.getTime()}`,
          }),
        );
        expect(walletService.award).not.toHaveBeenCalled();
      });

      it('rejects failed together with completed', async () => {
        await expect(
          service.update('m1', { failed: true, completed: true }, 'u1'),
        ).rejects.toThrow(BadRequestException);
        expect(repository.upsert).not.toHaveBeenCalled();
      });

      it('rejects any update to a failed mission', async () => {
        (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(
          failedRow,
        );

        await expect(
          service.update('m1', { progress: 100, completed: true }, 'u1'),
        ).rejects.toThrow(BadRequestException);
        expect(repository.upsert).not.toHaveBeenCalled();
      });

      it('rejects failing a completed mission', async () => {
        (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
          ...failedRow,
          completed: true,
          status: 'COMPLETED',
        });

        await expect(
          service.update('m1', { failed: true }, 'u1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    it('should throw NotFoundException if mission does not exist', async () => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('m1', { completed: true }, 'u1'),
      ).rejects.toThrow('Mission not found');
    });
  });

  describe('restart', () => {
    const catalogRow = { id: 'm1', code: 'M.A1.1', title: 'Test Mission' };
    const failedStart = new Date('2026-09-20T08:00:00.000Z');
    const restartedAt = new Date('2026-10-02T09:00:00.000Z');

    beforeEach(() => {
      (repository.findMissionByCodeOrId as jest.Mock).mockResolvedValue(
        catalogRow,
      );
    });

    it('starts a failed mission again and records MISSION_RESTARTED for the new attempt', async () => {
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 40,
        status: 'FAILED',
        startedAt: failedStart,
      });
      (repository.restart as jest.Mock).mockResolvedValue({
        missionId: 'm1',
        userId: 'u1',
        completed: false,
        progress: 0,
        status: 'NOT_STARTED',
        startedAt: restartedAt,
        mission: { title: 'Test Mission' },
      });

      const result = await service.restart('M.A1.1', 'u1');

      expect(repository.restart).toHaveBeenCalledWith('u1', 'm1');
      expect(result).toEqual(
        expect.objectContaining({
          progress: 0,
          completed: false,
          status: 'NOT_STARTED',
          startedAt: restartedAt,
        }),
      );
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.MISSION_RESTARTED,
          idempotencyKey: `mission-restarted:u1:m1:${restartedAt.getTime()}`,
          metadata: expect.objectContaining({
            previousStartedAt: failedStart.toISOString(),
          }),
        }),
      );
    });

    it.each([
      ['in progress', { status: 'IN_PROGRESS', completed: false }],
      ['completed', { status: 'COMPLETED', completed: true }],
      ['never started', null],
    ])('rejects restarting a %s mission', async (_label, row) => {
      (repository.findByUserIdAndMissionId as jest.Mock).mockResolvedValue(row);

      await expect(service.restart('M.A1.1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.restart).not.toHaveBeenCalled();
    });
  });
});
