import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeProgressService } from './knowledge-progress.service';
import { KnowledgeProgressRepository } from '../repositories/knowledge-progress.repository';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { NotFoundException } from '@nestjs/common';

describe('KnowledgeProgressService', () => {
  let service: KnowledgeProgressService;
  let progressRepository: jest.Mocked<KnowledgeProgressRepository>;
  let knowledgeRepository: jest.Mocked<KnowledgeRepository>;

  const mockKnowledge = {
    id: 'knowledge-1',
    userId: 'user-1',
    title: 'Test Quiz',
    available: true,
    content: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProgress = {
    id: 'progress-1',
    userId: 'user-1',
    knowledgeId: 'knowledge-1',
    completed: false,
    progress: { currentQuestionIndex: 0 },
    lastAccessedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockProgressRepository = {
      upsert: jest.fn(),
      findByUserAndKnowledge: jest.fn(),
      findByUserId: jest.fn(),
      deleteByUserAndKnowledge: jest.fn(),
    };

    const mockKnowledgeRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeProgressService,
        {
          provide: KnowledgeProgressRepository,
          useValue: mockProgressRepository,
        },
        { provide: KnowledgeRepository, useValue: mockKnowledgeRepository },
      ],
    }).compile();

    service = module.get<KnowledgeProgressService>(KnowledgeProgressService);
    progressRepository = module.get(KnowledgeProgressRepository);
    knowledgeRepository = module.get(KnowledgeRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProgress', () => {
    it('should update or create progress', async () => {
      knowledgeRepository.findById.mockResolvedValueOnce(mockKnowledge as any);
      progressRepository.upsert.mockResolvedValueOnce(mockProgress as any);

      const dto = { completed: false, progress: { score: 5 } };
      const result = await service.updateProgress('user-1', 'knowledge-1', dto);

      expect(result).toEqual(mockProgress);
      expect(progressRepository.upsert).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
        expect.objectContaining({
          completed: false,
          progress: { score: 5 },
        }),
      );
    });

    it('should throw NotFoundException if knowledge does not exist', async () => {
      knowledgeRepository.findById.mockResolvedValueOnce(null);

      await expect(
        service.updateProgress('user-1', 'invalid', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProgress', () => {
    it('should return progress if exists', async () => {
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(
        mockProgress as any,
      );

      const result = await service.getProgress('user-1', 'knowledge-1');

      expect(result).toEqual(mockProgress);
      expect(progressRepository.findByUserAndKnowledge).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
      );
    });

    it('should return null if no progress exists', async () => {
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(null);

      const result = await service.getProgress('user-1', 'knowledge-1');

      expect(result).toBeNull();
    });
  });

  describe('getAllUserProgress', () => {
    it('should return all progress for user', async () => {
      const progressList = [
        mockProgress,
        { ...mockProgress, id: 'progress-2' },
      ];
      progressRepository.findByUserId.mockResolvedValueOnce(
        progressList as any,
      );

      const result = await service.getAllUserProgress('user-1');

      expect(result).toEqual(progressList);
      expect(progressRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('deleteProgress', () => {
    it('should delete progress', async () => {
      progressRepository.deleteByUserAndKnowledge.mockResolvedValueOnce(
        undefined,
      );

      await service.deleteProgress('user-1', 'knowledge-1');

      expect(progressRepository.deleteByUserAndKnowledge).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
      );
    });
  });
});
