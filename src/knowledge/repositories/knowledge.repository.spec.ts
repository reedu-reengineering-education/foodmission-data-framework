import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeRepository } from './knowledge.repository';
import { PrismaService } from '../../database/prisma.service';

describe('KnowledgeRepository', () => {
  let repository: KnowledgeRepository;
  let prisma: jest.Mocked<PrismaService>;

  const mockKnowledge = {
    id: 'knowledge-1',
    userId: 'user-1',
    title: 'Test Quiz',
    description: 'Test Description',
    available: true,
    content: { questions: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      knowledge: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<KnowledgeRepository>(KnowledgeRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find knowledge by id', async () => {
      (prisma.knowledge.findUnique as jest.Mock).mockResolvedValueOnce(
        mockKnowledge,
      );

      const result = await repository.findById('knowledge-1');

      expect(result).toEqual(mockKnowledge);
      expect(prisma.knowledge.findUnique).toHaveBeenCalledWith({
        where: { id: 'knowledge-1' },
      });
    });
  });

  describe('create', () => {
    it('should create knowledge', async () => {
      const data = {
        userId: 'user-1',
        title: 'Test Quiz',
        content: { questions: [] },
      };
      (prisma.knowledge.create as jest.Mock).mockResolvedValueOnce(
        mockKnowledge,
      );

      const result = await repository.create(data as any);

      expect(result).toEqual(mockKnowledge);
      expect(prisma.knowledge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Test Quiz',
        }),
      });
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated results', async () => {
      (prisma.knowledge.findMany as jest.Mock).mockResolvedValueOnce([
        mockKnowledge,
      ]);
      (prisma.knowledge.count as jest.Mock).mockResolvedValueOnce(1);

      const result = await repository.findWithPagination({
        skip: 0,
        take: 10,
        where: { userId: 'user-1' },
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('update', () => {
    it('should update knowledge', async () => {
      const updated = { ...mockKnowledge, title: 'Updated' };
      (prisma.knowledge.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await repository.update('knowledge-1', {
        title: 'Updated',
      });

      expect(result.title).toBe('Updated');
      expect(prisma.knowledge.update).toHaveBeenCalledWith({
        where: { id: 'knowledge-1' },
        data: { title: 'Updated' },
      });
    });
  });

  describe('delete', () => {
    it('should delete knowledge', async () => {
      (prisma.knowledge.delete as jest.Mock).mockResolvedValueOnce(
        mockKnowledge,
      );

      await repository.delete('knowledge-1');

      expect(prisma.knowledge.delete).toHaveBeenCalledWith({
        where: { id: 'knowledge-1' },
      });
    });
  });
});
