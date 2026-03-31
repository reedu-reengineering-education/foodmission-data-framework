import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressService } from './challenge-progress.service';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ChallengeProgressService', () => {
  let service: ChallengeProgressService;
  let repository: ChallengeProgressRepository;

  beforeEach(async () => {
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
        challenge: { title: 'Test Challenge' },
      };
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        mockProgress,
      );
      const result = await service.getChallengeById('c1', 'u1');
      expect(repository.findByUserIdAndChallengeId).toHaveBeenCalledWith(
        'u1',
        'c1',
      );
      expect(result).toEqual({
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        challengeTitle: 'Test Challenge',
      });
    });

    it('should throw NotFoundException if progress not found', async () => {
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.getChallengeById('c1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if userId does not match', async () => {
      const mockProgress = {
        challengeId: 'c1',
        userId: 'other',
        completed: false,
        progress: 0.5,
        challenge: { title: 'Test Challenge' },
      };
      (repository.findByUserIdAndChallengeId as jest.Mock).mockResolvedValue(
        mockProgress,
      );
      await expect(service.getChallengeById('c1', 'u1')).rejects.toThrow(
        ForbiddenException,
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
      expect(repository.findAllByUserId).toHaveBeenCalledWith('u1');
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
    it('should update and return challenge progress if found and userId matches', async () => {
      const existing = {
        challengeId: 'c1',
        userId: 'u1',
        completed: false,
        progress: 0.5,
        challenge: { title: 'Test Challenge' },
      };
      const updated = {
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
        challenge: { title: 'Test Challenge' },
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
      });
      expect(result).toEqual({
        challengeId: 'c1',
        userId: 'u1',
        completed: true,
        progress: 1,
        challengeTitle: 'Test Challenge',
      });
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
        challenge: { title: 'Test Challenge' },
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
