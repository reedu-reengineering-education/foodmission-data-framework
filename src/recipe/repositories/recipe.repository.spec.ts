import { Test, TestingModule } from '@nestjs/testing';
import { RecipeRepository } from './recipe.repository';
import { PrismaService } from '../../database/prisma.service';

describe('RecipeRepository', () => {
  let repository: RecipeRepository;
  let mockPrismaService: any;

  const mockRecipe = {
    id: 'recipe-1',
    userId: 'user-1',
    mealId: 'meal-1',
    title: 'Test Recipe',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    mockPrismaService = {
      recipe: {
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
        RecipeRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<RecipeRepository>(RecipeRepository);
    jest.clearAllMocks();
  });

  describe('findWithPagination', () => {
    it('should normalize non-positive take values and return normalized limit', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValueOnce([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValueOnce(1);

      const result = await repository.findWithPagination({ take: 0, skip: 0 });

      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: undefined,
      });
      expect(result.limit).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate page and totalPages based on normalized pagination', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValueOnce([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValueOnce(25);

      const result = await repository.findWithPagination({ skip: 12, take: 5 });

      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        skip: 12,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: undefined,
      });
      expect(result.page).toBe(3); // floor(12 / 5) + 1
      expect(result.totalPages).toBe(5); // ceil(25 / 5)
      expect(result.limit).toBe(5);
    });
  });
});
