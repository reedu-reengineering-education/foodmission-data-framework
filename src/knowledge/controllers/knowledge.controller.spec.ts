import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from '../services/knowledge.service';
import { KnowledgeProgressService } from '../services/knowledge-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let service: jest.Mocked<KnowledgeService>;
  let progressService: jest.Mocked<KnowledgeProgressService>;

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
    progress: { score: 0 },
    lastAccessedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockKnowledgeService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockProgressService = {
      updateProgress: jest.fn(),
      getProgress: jest.fn(),
      getAllUserProgress: jest.fn(),
      deleteProgress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: KnowledgeProgressService, useValue: mockProgressService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KnowledgeController>(KnowledgeController);
    service = module.get(KnowledgeService);
    progressService = module.get(KnowledgeProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create knowledge with user id', async () => {
      service.create.mockResolvedValueOnce(mockKnowledge as any);
      const dto = {
        title: 'Test Quiz',
        content: { questions: [] },
      };
      const result = await controller.create(dto as any, 'user-1');

      expect(result).toEqual(mockKnowledge);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('findAll', () => {
    it('should pass filters and user id to service', async () => {
      const query = { page: 1, limit: 10, available: true, search: 'test' };
      service.findAll.mockResolvedValueOnce({
        data: [mockKnowledge],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      } as any);

      const result = await controller.findAll('user-1', query as any);

      expect(result.data).toContain(mockKnowledge);
      expect(service.findAll).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('getAllProgress', () => {
    it('should retrieve all progress before findOne route', async () => {
      progressService.getAllUserProgress.mockResolvedValueOnce([
        mockProgress,
      ] as any);
      const result = await controller.getAllProgress('user-1');
      expect(result).toEqual([mockProgress]);
      expect(progressService.getAllUserProgress).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should retrieve knowledge by id', async () => {
      service.findOne.mockResolvedValueOnce(mockKnowledge as any);
      const result = await controller.findOne('knowledge-1', 'user-1');
      expect(result).toEqual(mockKnowledge);
      expect(service.findOne).toHaveBeenCalledWith('knowledge-1', 'user-1');
    });
  });

  describe('update', () => {
    it('should call service with id, dto, and user', async () => {
      const updated = { ...mockKnowledge, title: 'Updated' };
      service.update.mockResolvedValueOnce(updated as any);
      const dto = { title: 'Updated' };
      const result = await controller.update(
        'knowledge-1',
        dto as any,
        'user-1',
      );
      expect(result.title).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith('knowledge-1', dto, 'user-1');
    });
  });

  describe('remove', () => {
    it('should delegate to service', async () => {
      service.remove.mockResolvedValueOnce(undefined);
      await controller.remove('knowledge-1', 'user-1');
      expect(service.remove).toHaveBeenCalledWith('knowledge-1', 'user-1');
    });
  });

  describe('progress endpoints', () => {
    it('getProgress should retrieve user progress', async () => {
      progressService.getProgress.mockResolvedValueOnce(mockProgress as any);
      const result = await controller.getProgress('knowledge-1', 'user-1');
      expect(result).toEqual(mockProgress);
      expect(progressService.getProgress).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
      );
    });

    it('updateProgress should update progress', async () => {
      const dto = { completed: true, progress: { score: 10 } };
      progressService.updateProgress.mockResolvedValueOnce(mockProgress as any);
      const result = await controller.updateProgress(
        'knowledge-1',
        dto as any,
        'user-1',
      );
      expect(result).toEqual(mockProgress);
      expect(progressService.updateProgress).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
        dto,
      );
    });

    it('deleteProgress should remove progress', async () => {
      progressService.deleteProgress.mockResolvedValueOnce(undefined);
      await controller.deleteProgress('knowledge-1', 'user-1');
      expect(progressService.deleteProgress).toHaveBeenCalledWith(
        'user-1',
        'knowledge-1',
      );
    });
  });
});
