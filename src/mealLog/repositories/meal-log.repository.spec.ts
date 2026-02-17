import { Test, TestingModule } from '@nestjs/testing';
import { MealLogRepository } from './meal-log.repository';
import { PrismaService } from '../../database/prisma.service';

describe('MealLogRepository', () => {
  let repository: MealLogRepository;
  let mockPrismaService: any;

  const mockMealLog = {
    id: 'meal-log-1',
    userId: 'user-1',
    mealId: 'meal-1',
    typeOfMeal: 'BREAKFAST',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    mockPrismaService = {
      mealLog: {
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
        MealLogRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<MealLogRepository>(MealLogRepository);
    jest.clearAllMocks();
  });

  describe('findWithPagination', () => {
    it('should normalize non-positive take values and return normalized limit', async () => {
      mockPrismaService.mealLog.findMany.mockResolvedValueOnce([mockMealLog]);
      mockPrismaService.mealLog.count.mockResolvedValueOnce(1);

      const result = await repository.findWithPagination({ take: 0, skip: 0 });

      expect(mockPrismaService.mealLog.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy: { timestamp: 'desc' },
        include: undefined,
      });
      expect(result.limit).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate page and totalPages based on normalized pagination', async () => {
      mockPrismaService.mealLog.findMany.mockResolvedValueOnce([mockMealLog]);
      mockPrismaService.mealLog.count.mockResolvedValueOnce(42);

      const result = await repository.findWithPagination({ skip: 15, take: 5 });

      expect(mockPrismaService.mealLog.findMany).toHaveBeenCalledWith({
        skip: 15,
        take: 5,
        where: undefined,
        orderBy: { timestamp: 'desc' },
        include: undefined,
      });
      expect(result.page).toBe(4); // floor(15 / 5) + 1
      expect(result.totalPages).toBe(9); // ceil(42 / 5)
      expect(result.limit).toBe(5);
    });
  });
});
