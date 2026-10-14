import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressService } from './challenge-progress.service';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TranslationService } from '../../translations/services/translation.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { GamificationWalletService } from '../../gamification/services/gamification-wallet.service';
import { CompletionRewardService } from '../../gamification/services/completion-reward.service';
import { RewardSourceType, WalletCurrency } from '@prisma/client';

describe('ChallengeProgressService', () => {
  let service: ChallengeProgressService;
  let repository: ChallengeProgressRepository;
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
        ChallengeProgressService,
        {
          provide: ChallengeProgressRepository,
          useValue: {
            findChallengeByCodeOrId: jest.fn(),
            findByUserIdAndChallengeId: jest.fn(),
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

    service = module.get<ChallengeProgressService>(ChallengeProgressService);
    repository = module.get<ChallengeProgressRepository>(
      ChallengeProgressRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChallengeById', () => {
    it('should return challenge progress if found', async () => {
      const mockProgress = {
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        startedAt: new Date('2026-09-30T08:15:00.000Z'),
        challenge: { title: 'Test Challenge' },
      };
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        mockProgress,
      );
      const result = await service.getChallengeById('c1', 'u1');
      expect(result).toEqual({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        status: 'NOT_STARTED',
        challengeTitle: 'Test Challenge',
        startedAt: new Date('2026-09-30T08:15:00.000Z'),
      });
    });

    it('should return default progress when challenge exists but no row yet', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      const result = await service.getChallengeById('c1', 'u1');
      expect(result).toEqual({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0,
        status: 'NOT_STARTED',
        challengeTitle: 'Test Challenge',
        startedAt: null,
      });
    });

    it('should throw NotFoundException if challenge does not exist', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue(null);
      await expect(service.getChallengeById('c1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllChallengesByUserId', () => {
    it('should return all challenge progresses for user', async () => {
      const mockProgresses = [
        {
          challengeId: 'c1',
          userId: 'u1',
          completed: false,
          progress: 0.5,
          startedAt: new Date('2026-09-30T08:15:00.000Z'),
          challenge: { title: 'Challenge 1' },
        },
        {
          challengeId: 'c2',
          userId: 'u1',
          completed: true,
          progress: 1,
          challenge: { title: 'Challenge 2' },
        },
      ];
      (repository.findAllByUserId as jest.Mock).mockResolvedValue(
        mockProgresses,
      );
      const result = await service.getAllChallengesByUserId('u1');
      expect(result).toEqual([
        {
          challengeId: 'c1',
          userId: 'u1',
          completed: false,
          progress: 0.5,
          status: 'NOT_STARTED',
          challengeTitle: 'Challenge 1',
          startedAt: new Date('2026-09-30T08:15:00.000Z'),
        },
        {
          challengeId: 'c2',
          userId: 'u1',
          completed: true,
          progress: 1,
          status: 'NOT_STARTED',
          challengeTitle: 'Challenge 2',
          startedAt: null,
        },
      ]);
    });
  });

  describe('update', () => {
    it('should upsert and return challenge progress', async () => {
      const updated = {
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
        challenge: { title: 'Test Challenge' },
      };
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue(updated);
      const result = await service.update(
        'c1',
        { completed: true, progress: 1 },
        'u1',
      );
      expect(repository.upsert).toHaveBeenCalledWith('u1', 'c1', {
        completed: true,
        progress: 1,
      });
      expect(result).toEqual({
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
        status: 'NOT_STARTED',
        challengeTitle: 'Test Challenge',
        startedAt: null,
        reward: null,
      });
    });

    it('awards the challenge reward on first completion', async () => {
      const updated = {
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
        challenge: { title: 'Test Challenge' },
      };
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
        reward: { id: 'r1', xp: 15, points: 20 },
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(
        'c1',
        { completed: true, progress: 1 },
        'u1',
      );

      expect(walletService.award).toHaveBeenCalledTimes(2);
      expect(walletService.award).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          rewardId: 'r1',
          sourceType: RewardSourceType.CHALLENGE,
          sourceId: 'c1',
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

    it('does not award the reward when the challenge was already completed', async () => {
      const updated = {
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
        challenge: { title: 'Test Challenge' },
      };
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
        reward: { id: 'r1', xp: 15, points: 20 },
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
      });
      (repository.upsert as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('c1', { completed: true }, 'u1');

      expect(walletService.award).not.toHaveBeenCalled();
      expect(result.reward).toBeNull();
    });

    it('resolves a challenge code and upserts by id', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 10,
        challenge: { title: 'Test Challenge' },
      });

      await service.update('CH.A1.1', { progress: 10 }, 'u1');

      expect(repository.findChallengeByCodeOrId).toHaveBeenCalledWith(
        'CH.A1.1',
      );
      expect(repository.upsert).toHaveBeenCalledWith('u1', 'c1', {
        progress: 10,
      });
    });

    it('emits CHALLENGE_STARTED on first active progress', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 10,
        challenge: { title: 'Test Challenge' },
      });

      await service.update('c1', { progress: 10 }, 'u1');

      expect(userEventService.record).toHaveBeenCalledTimes(1);
      expect(userEventService.record).toHaveBeenCalledWith({
        userId: 'u1',
        eventType: EventType.CHALLENGE_STARTED,
        source: EventSource.CHALLENGE,
        metadata: {
          challengeId: 'c1',
          challengeCode: 'CH.A1.1',
          source: EventSource.API,
          body: { progress: 10 },
        },
        idempotencyKey: 'challenge-started:u1:c1',
      });
    });

    it('emits CHALLENGE_UPDATED when progress changes after start', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 10,
      });
      (repository.upsert as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 40,
        challenge: { title: 'Test Challenge' },
      });

      await service.update('c1', { progress: 40 }, 'u1');

      expect(userEventService.record).toHaveBeenCalledTimes(1);
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.CHALLENGE_UPDATED,
          idempotencyKey: 'challenge-updated:u1:c1:40:false',
          metadata: expect.objectContaining({
            body: { progress: 40 },
          }),
        }),
      );
    });

    it('emits UPDATED and COMPLETED when completing an in-progress challenge', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 40,
      });
      (repository.upsert as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 100,
        challenge: { title: 'Test Challenge' },
      });

      await service.update('c1', { completed: true, progress: 100 }, 'u1');

      expect(userEventService.record).toHaveBeenCalledTimes(2);
      expect(userEventService.record.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.CHALLENGE_UPDATED,
        }),
      );
      expect(userEventService.record.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.CHALLENGE_COMPLETED,
          idempotencyKey: 'challenge-completed:u1:c1',
        }),
      );
    });

    it('does not emit on a zero-progress create or completed retry', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue({
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
      });
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      (repository.upsert as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0,
        challenge: { title: 'Test Challenge' },
      });

      await service.update('c1', { progress: 0 }, 'u1');
      expect(userEventService.record).not.toHaveBeenCalled();

      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 100,
      });
      (repository.upsert as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 100,
        challenge: { title: 'Test Challenge' },
      });

      await service.update('c1', { completed: true, progress: 100 }, 'u1');
      expect(userEventService.record).not.toHaveBeenCalled();
    });

    describe('giving up', () => {
      const catalogRow = {
        id: 'c1',
        code: 'CH.A1.1',
        title: 'Test Challenge',
        reward: { id: 'r1', xp: 15, points: 20 },
      };
      const failedRow = {
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 40,
        status: 'FAILED',
        startedAt: new Date('2026-09-30T08:00:00.000Z'),
        challenge: { title: 'Test Challenge' },
      };

      beforeEach(() => {
        (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue(
          catalogRow,
        );
      });

      it('marks the challenge FAILED and records CHALLENGE_FAILED once, without a reward', async () => {
        (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
          ...failedRow,
          status: 'IN_PROGRESS',
        });
        (repository.upsert as jest.Mock).mockResolvedValue(failedRow);

        const result = await service.update('c1', { failed: true }, 'u1');

        expect(repository.upsert).toHaveBeenCalledWith('u1', 'c1', {
          failed: true,
        });
        expect(result.status).toBe('FAILED');
        expect(result.reward).toBeNull();
        expect(userEventService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: EventType.CHALLENGE_FAILED,
            idempotencyKey: `challenge-failed:u1:c1:${failedRow.startedAt.getTime()}`,
          }),
        );
        expect(walletService.award).not.toHaveBeenCalled();
      });

      it('rejects failed together with completed', async () => {
        await expect(
          service.update('c1', { failed: true, completed: true }, 'u1'),
        ).rejects.toThrow(BadRequestException);
        expect(repository.upsert).not.toHaveBeenCalled();
      });

      it('rejects any update to a failed challenge', async () => {
        (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
          failedRow,
        );

        await expect(
          service.update('c1', { progress: 100, completed: true }, 'u1'),
        ).rejects.toThrow(BadRequestException);
        expect(repository.upsert).not.toHaveBeenCalled();
      });

      it('rejects failing a completed challenge', async () => {
        (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
          ...failedRow,
          completed: true,
          status: 'COMPLETED',
        });

        await expect(
          service.update('c1', { failed: true }, 'u1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    it('should throw NotFoundException if challenge does not exist', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('c1', { completed: true }, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restart', () => {
    const catalogRow = { id: 'c1', code: 'CH.A1.1', title: 'Test Challenge' };
    const failedStart = new Date('2026-09-20T08:00:00.000Z');
    const restartedAt = new Date('2026-10-02T09:00:00.000Z');

    beforeEach(() => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue(
        catalogRow,
      );
    });

    it('starts a failed challenge again and records CHALLENGE_RESTARTED for the new attempt', async () => {
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 40,
        status: 'FAILED',
        startedAt: failedStart,
      });
      (repository.restart as jest.Mock).mockResolvedValue({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0,
        status: 'NOT_STARTED',
        startedAt: restartedAt,
        challenge: { title: 'Test Challenge' },
      });

      const result = await service.restart('CH.A1.1', 'u1');

      expect(repository.restart).toHaveBeenCalledWith('u1', 'c1');
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
          eventType: EventType.CHALLENGE_RESTARTED,
          idempotencyKey: `challenge-restarted:u1:c1:${restartedAt.getTime()}`,
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
    ])('rejects restarting a %s challenge', async (_label, row) => {
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        row,
      );

      await expect(service.restart('CH.A1.1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.restart).not.toHaveBeenCalled();
    });
  });
});
