import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { KnowledgeProgressRepository } from '../repositories/knowledge-progress.repository';
import { NotFoundException } from '@nestjs/common';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let repository: jest.Mocked<KnowledgeRepository>;
  let progressRepository: jest.Mocked<KnowledgeProgressRepository>;

  const mockKnowledge = {
    id: 'knowledge-1',
    userId: 'user-1',
    title: 'Test Quiz',
    description: 'Test Description',
    available: true,
    content: {
      questions: [
        {
          question: 'Test?',
          options: ['A', 'B'],
          correctAnswer: 'A',
        },
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProgress = {
    id: 'progress-1',
    userId: 'user-1',
    knowledgeId: 'knowledge-1',
    completed: false,
    progress: {},
    lastAccessedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockKnowledgeRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      findWithPagination: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockProgressRepository = {
      findByUserAndKnowledge: jest.fn(),
      findManyByKnowledgeIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KnowledgeRepository, useValue: mockKnowledgeRepository },
        {
          provide: KnowledgeProgressRepository,
          useValue: mockProgressRepository,
        },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    repository = module.get(KnowledgeRepository);
    progressRepository = module.get(KnowledgeProgressRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a knowledge item', async () => {
      repository.create.mockResolvedValueOnce(mockKnowledge as any);
      const dto = {
        title: 'Test Quiz',
        content: { questions: [] },
      };

      const result = await service.create(dto as any, 'user-1');

      expect(result.title).toBe('Test Quiz');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Quiz',
          userId: 'user-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated knowledge with progress using bulk fetch', async () => {
      const knowledge1 = { ...mockKnowledge, id: 'k-1' };
      const knowledge2 = { ...mockKnowledge, id: 'k-2' };

      repository.findWithPagination.mockResolvedValueOnce({
        data: [knowledge1, knowledge2] as any,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const progress1 = { ...mockProgress, knowledgeId: 'k-1' };
      progressRepository.findManyByKnowledgeIds.mockResolvedValueOnce([
        progress1,
      ] as any);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(progressRepository.findManyByKnowledgeIds).toHaveBeenCalledWith(
        'user-1',
        ['k-1', 'k-2'],
      );
    });

    it('should filter by search term', async () => {
      repository.findWithPagination.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
      progressRepository.findManyByKnowledgeIds.mockResolvedValueOnce([]);

      await service.findAll('user-1', {
        page: 1,
        limit: 10,
        search: 'nutrition',
      });

      expect(repository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return knowledge with progress', async () => {
      repository.findById.mockResolvedValueOnce(mockKnowledge as any);
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(
        mockProgress as any,
      );

      const result = await service.findOne('knowledge-1', 'user-1');

      expect(result.id).toBe('knowledge-1');
      expect(repository.findById).toHaveBeenCalledWith('knowledge-1');
      expect(progressRepository.findByUserAndKnowledge).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
      );
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if not owned by user', async () => {
      const otherUserKnowledge = { ...mockKnowledge, userId: 'other-user' };
      repository.findById.mockResolvedValueOnce(otherUserKnowledge as any);

      await expect(service.findOne('knowledge-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update knowledge item', async () => {
      repository.findById.mockResolvedValueOnce(mockKnowledge as any);
      const updated = { ...mockKnowledge, title: 'Updated' };
      repository.update.mockResolvedValueOnce(updated as any);
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(null);

      const result = await service.update(
        'knowledge-1',
        { title: 'Updated' },
        'user-1',
      );

      expect(result.title).toBe('Updated');
      expect(repository.update).toHaveBeenCalledWith('knowledge-1', {
        title: 'Updated',
        content: undefined,
      });
    });
  });

  describe('remove', () => {
    it('should delete knowledge item', async () => {
      repository.findById.mockResolvedValueOnce(mockKnowledge as any);
      repository.delete.mockResolvedValueOnce(undefined);

      await service.remove('knowledge-1', 'user-1');

      expect(repository.delete).toHaveBeenCalledWith('knowledge-1');
    });
  });
});
