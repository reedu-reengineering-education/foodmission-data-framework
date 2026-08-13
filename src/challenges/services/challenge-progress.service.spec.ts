import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressService } from './challenge-progress.service';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { NotFoundException } from '@nestjs/common';
import { TranslationService } from '../../translations/services/translation.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

describe('ChallengeProgressService', () => {
  let service: ChallengeProgressService;
  let repository: ChallengeProgressRepository;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;

  beforeEach(async () => {
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
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
        challengeTitle: 'Test Challenge',
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
        challengeTitle: 'Test Challenge',
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
          challengeTitle: 'Challenge 1',
        },
        {
          challengeId: 'c2',
          userId: 'u1',
          completed: true,
          progress: 1,
          challengeTitle: 'Challenge 2',
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
        challengeTitle: 'Test Challenge',
      });
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

      expect(repository.findChallengeByCodeOrId).toHaveBeenCalledWith('CH.A1.1');
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

    it('should throw NotFoundException if challenge does not exist', async () => {
      (repository.findChallengeByCodeOrId as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('c1', { completed: true }, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
