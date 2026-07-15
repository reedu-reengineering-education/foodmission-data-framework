import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressService } from './challenge-progress.service';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProgressStatus } from '@prisma/client';

describe('ChallengeProgressService', () => {
  let service: ChallengeProgressService;
  let repository: ChallengeProgressRepository;

  const mockGamificationI18n = {
    getChallengeCopy: jest.fn((_slug, fallbacks) => fallbacks),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeProgressService,
        {
          provide: ChallengeProgressRepository,
          useValue: {
            findByUserIdAndChallengeId: jest.fn(),
            findAllByUserId: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: GamificationI18nService,
          useValue: mockGamificationI18n,
        },
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
    it('should return challenge progress if found and userId matches', async () => {
      const mockProgress = {
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        status: ProgressStatus.ACTIVE,
        challenge: {
          slug: 'bring-your-own-bag',
          title: 'Test Challenge',
          description: 'Test Description',
        },
      };
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
        status: ProgressStatus.ACTIVE,
      });
    });
  });

  describe('update', () => {
    it('should set status to ACHIEVED when completed is true', async () => {
      const existing = {
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        status: ProgressStatus.ACTIVE,
        challenge: {
          slug: 'bring-your-own-bag',
          title: 'Test Challenge',
          description: 'Test Description',
        },
      };
      const updated = {
        ...existing,
        completed: true,
        progress: 1,
        status: ProgressStatus.ACHIEVED,
      };
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        existing,
      );
      (repository.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(
        'c1',
        { completed: true, progress: 1 },
        'u1',
      );

      expect(repository.update).toHaveBeenCalledWith('u1', 'c1', {
        completed: true,
        progress: 1,
        status: ProgressStatus.ACHIEVED,
      });
      expect(result.status).toBe(ProgressStatus.ACHIEVED);
    });

    it('should throw NotFoundException if progress not found', async () => {
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.update('c1', { completed: true }, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if userId does not match', async () => {
      const existing = {
        challengeId: 'c1',
        userId: 'other',
        completed: false,
        progress: 0.5,
        status: ProgressStatus.ACTIVE,
        challenge: {
          slug: 'bring-your-own-bag',
          title: 'Test Challenge',
          description: 'Test Description',
        },
      };
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        existing,
      );
      await expect(
        service.update('c1', { completed: true }, 'u1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
