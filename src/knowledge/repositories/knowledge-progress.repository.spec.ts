import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeProgressRepository } from './knowledge-progress.repository';
import { PrismaService } from '../../database/prisma.service';

describe('KnowledgeProgressRepository', () => {
  let repository: KnowledgeProgressRepository;
  let prisma: jest.Mocked<PrismaService>;

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
    const mockPrismaService = {
      userKnowledgeProgress: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeProgressRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<KnowledgeProgressRepository>(
      KnowledgeProgressRepository,
    );
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return progress ordered by lastAccessedAt desc', async () => {
      (
        prisma.userKnowledgeProgress.findMany as jest.Mock
      ).mockResolvedValueOnce([mockProgress]);

      const result = await repository.findByUserId('user-1');

      expect(result).toEqual([mockProgress]);
      expect(prisma.userKnowledgeProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { lastAccessedAt: 'desc' },
      });
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated results', async () => {
      (
        prisma.userKnowledgeProgress.findMany as jest.Mock
      ).mockResolvedValueOnce([mockProgress]);
      (prisma.userKnowledgeProgress.count as jest.Mock).mockResolvedValueOnce(
        1,
      );

      const result = await repository.findWithPagination({
        skip: 0,
        take: 10,
        where: { userId: 'user-1' },
      });

      expect(result.data).toEqual([mockProgress]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });
});
