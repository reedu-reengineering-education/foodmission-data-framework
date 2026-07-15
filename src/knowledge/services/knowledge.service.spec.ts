import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { KnowledgeProgressRepository } from '../repositories/knowledge-progress.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { KnowledgeI18nService } from '../../i18n/knowledge-i18n.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let repository: jest.Mocked<KnowledgeRepository>;
  let progressRepository: jest.Mocked<KnowledgeProgressRepository>;
  let knowledgeI18n: jest.Mocked<KnowledgeI18nService>;

  const mockKnowledge = {
    id: 'knowledge-1',
    slug: 'nutrition-basics',
    userId: 'user-1',
    title: 'Nutrition Basics',
    description: 'A short quiz about basic nutrition facts and macros.',
    available: true,
    content: {
      questions: [
        {
          question: 'Which macronutrient is the primary source of energy?',
          options: ['Vitamins', 'Carbohydrates', 'Water', 'Minerals'],
          correctAnswer: 'Carbohydrates',
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

    const mockKnowledgeI18n = {
      getKnowledgeCopy: jest.fn((slug, fallbacks) => fallbacks),
      getKnowledgeQuizContent: jest.fn((_slug, fallbackContent) => fallbackContent),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KnowledgeRepository, useValue: mockKnowledgeRepository },
        {
          provide: KnowledgeProgressRepository,
          useValue: mockProgressRepository,
        },
        { provide: KnowledgeI18nService, useValue: mockKnowledgeI18n },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    repository = module.get(KnowledgeRepository);
    progressRepository = module.get(KnowledgeProgressRepository);
    knowledgeI18n = module.get(KnowledgeI18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a knowledge item', async () => {
      repository.create.mockResolvedValueOnce(mockKnowledge);
      const dto = {
        title: 'Test Quiz',
        content: { questions: [] },
      };

      const result = await service.create(dto, 'user-1');

      expect(result.title).toBe('Nutrition Basics');
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
        data: [knowledge1, knowledge2],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const progress1 = { ...mockProgress, knowledgeId: 'k-1' };
      progressRepository.findManyByKnowledgeIds.mockResolvedValueOnce([
        progress1,
      ]);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(progressRepository.findManyByKnowledgeIds).toHaveBeenCalledWith(
        'user-1',
        ['k-1', 'k-2'],
      );
    });

    it('should apply i18n overlay when lang is provided', async () => {
      repository.findWithPagination.mockResolvedValueOnce({
        data: [mockKnowledge],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      progressRepository.findManyByKnowledgeIds.mockResolvedValueOnce([]);
      knowledgeI18n.getKnowledgeCopy.mockReturnValueOnce({
        title: 'Ernährungsgrundlagen',
        description: 'German description',
      });
      knowledgeI18n.getKnowledgeQuizContent.mockReturnValueOnce({
        questions: [
          {
            question: 'German question?',
            options: ['A', 'B'],
            correctAnswer: 'A',
          },
        ],
      });

      const result = await service.findAll('user-1', { page: 1, limit: 10, lang: 'de' });

      expect(result.data[0].title).toBe('Ernährungsgrundlagen');
      expect(result.data[0].content.questions[0].question).toBe('German question?');
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
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ title: expect.any(Object) }),
                  expect.objectContaining({ description: expect.any(Object) }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return knowledge with progress', async () => {
      repository.findById.mockResolvedValueOnce(mockKnowledge);
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(
        mockProgress,
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

    it('should allow access to public knowledge owned by another user', async () => {
      const otherUserKnowledge = {
        ...mockKnowledge,
        userId: 'other-user',
        available: true,
      };
      repository.findById.mockResolvedValueOnce(otherUserKnowledge);
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(null);

      const result = await service.findOne('knowledge-1', 'user-1');
      expect(result.id).toBe('knowledge-1');
    });

    it('should throw ForbiddenException for private knowledge owned by another user', async () => {
      const otherUserPrivate = {
        ...mockKnowledge,
        userId: 'other-user',
        available: false,
      };
      repository.findById.mockResolvedValueOnce(otherUserPrivate);

      await expect(service.findOne('knowledge-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update knowledge availability', async () => {
      repository.findById.mockResolvedValueOnce(mockKnowledge);
      const updated = { ...mockKnowledge, available: false };
      repository.update.mockResolvedValueOnce(updated);
      progressRepository.findByUserAndKnowledge.mockResolvedValueOnce(null);

      const result = await service.update(
        'knowledge-1',
        { available: false },
        'user-1',
      );

      expect(result.available).toBe(false);
      expect(repository.update).toHaveBeenCalledWith('knowledge-1', {
        available: false,
      });
    });
  });

  describe('remove', () => {
    it('should delete knowledge item', async () => {
      repository.findById.mockResolvedValueOnce(mockKnowledge);
      repository.delete.mockResolvedValueOnce(undefined);

      await service.remove('knowledge-1', 'user-1');

      expect(repository.delete).toHaveBeenCalledWith('knowledge-1');
    });
  });
});
