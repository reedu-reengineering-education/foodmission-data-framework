import { Test, TestingModule } from '@nestjs/testing';
import { FoodCategoryRepository } from './food-category.repository';
import { PrismaService } from '../../database/prisma.service';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FoodCategoryQueryDto } from '../dto/food-category-query.dto';
import { TEST_FOOD_CATEGORY } from '../../../test/fixtures/food.fixtures';

describe('FoodCategoryRepository', () => {
  let repository: FoodCategoryRepository;
  let prisma: any;

  const mockCategory: any = { ...TEST_FOOD_CATEGORY, id: 'cat-123' };

  const mockPrismaService: any = {
    foodCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodCategoryRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<FoodCategoryRepository>(FoodCategoryRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a food category', async () => {
      const createDto: CreateFoodCategoryDto = {
        nevoVersion: '2025',
        foodGroup: 'Vegetables',
        nevoCode: 1234,
        foodName: 'Tomato, raw',
        synonym: 'Fresh tomatoes',
        quantity: '100g',
      };

      prisma.foodCategory.create.mockResolvedValue(mockCategory);

      const result = await repository.create(createDto);

      expect(prisma.foodCategory.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should create a category with nutritional data', async () => {
      const createDto: CreateFoodCategoryDto = {
        nevoVersion: '2025',
        foodGroup: 'Vegetables',
        nevoCode: 1234,
        foodName: 'Tomato, raw',
        energyKcal: 18,
        proteins: 0.9,
      };

      prisma.foodCategory.create.mockResolvedValue(mockCategory);

      const result = await repository.create(createDto);

      expect(prisma.foodCategory.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result.energyKcal).toBe(18);
    });
  });

  describe('findAll', () => {
    it('should return paginated food categories', async () => {
      const query: FoodCategoryQueryDto = {
        page: 1,
        limit: 20,
      };

      prisma.foodCategory.findMany.mockResolvedValue([mockCategory]);
      prisma.foodCategory.count.mockResolvedValue(1);

      const result = await repository.findAll(query);

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { foodName: 'asc' },
      });
      expect(prisma.foodCategory.count).toHaveBeenCalledWith({ where: {} });
      expect(result.items).toEqual([mockCategory]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should handle search query with case-insensitive matching', async () => {
      const query: FoodCategoryQueryDto = {
        search: 'tomato',
        page: 1,
        limit: 20,
      };

      prisma.foodCategory.findMany.mockResolvedValue([mockCategory]);
      prisma.foodCategory.count.mockResolvedValue(1);

      const result = await repository.findAll(query);

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { foodName: { contains: 'tomato', mode: 'insensitive' } },
                {
                  AND: [
                    { synonym: { not: null } },
                    { synonym: { contains: 'tomato', mode: 'insensitive' } },
                  ],
                },
              ],
            },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { foodName: 'asc' },
      });
      expect(result.items).toHaveLength(1);
    });

    it('should filter by food group with case-insensitive matching', async () => {
      const query: FoodCategoryQueryDto = {
        foodGroup: 'Vegetables',
        page: 1,
        limit: 20,
      };

      prisma.foodCategory.findMany.mockResolvedValue([mockCategory]);
      prisma.foodCategory.count.mockResolvedValue(1);

      const result = await repository.findAll(query);

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              foodGroup: { equals: 'Vegetables', mode: 'insensitive' },
            },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { foodName: 'asc' },
      });
      expect(result.items[0].foodGroup).toBe('Vegetables');
    });

    it('should handle search and filter combined', async () => {
      const query: FoodCategoryQueryDto = {
        search: 'tomato',
        foodGroup: 'Vegetables',
        page: 1,
        limit: 20,
      };

      prisma.foodCategory.findMany.mockResolvedValue([mockCategory]);
      prisma.foodCategory.count.mockResolvedValue(1);

      await repository.findAll(query);

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { foodName: { contains: 'tomato', mode: 'insensitive' } },
                {
                  AND: [
                    { synonym: { not: null } },
                    { synonym: { contains: 'tomato', mode: 'insensitive' } },
                  ],
                },
              ],
            },
            {
              foodGroup: { equals: 'Vegetables', mode: 'insensitive' },
            },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { foodName: 'asc' },
      });
    });

    it('should calculate skip correctly for different pages', async () => {
      const query: FoodCategoryQueryDto = {
        page: 3,
        limit: 10,
      };

      prisma.foodCategory.findMany.mockResolvedValue([]);
      prisma.foodCategory.count.mockResolvedValue(25);

      const result = await repository.findAll(query);

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 20, // (3 - 1) * 10
        take: 10,
        orderBy: { foodName: 'asc' },
      });
      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
    });

    it('should return empty results when no matches found', async () => {
      const query: FoodCategoryQueryDto = {
        search: 'nonexistent',
        page: 1,
        limit: 20,
      };

      prisma.foodCategory.findMany.mockResolvedValue([]);
      prisma.foodCategory.count.mockResolvedValue(0);

      const result = await repository.findAll(query);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return a food category by id', async () => {
      prisma.foodCategory.findUnique.mockResolvedValue(mockCategory);

      const result = await repository.findById('cat-123');

      expect(prisma.foodCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null when category not found', async () => {
      prisma.foodCategory.findUnique.mockResolvedValue(null);

      const result = await repository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a food category', async () => {
      const updateDto: UpdateFoodCategoryDto = {
        foodName: 'Tomato, cooked',
        energyKcal: 20,
      };

      const updatedCategory = {
        ...mockCategory,
        foodName: 'Tomato, cooked',
        energyKcal: 20,
      };

      prisma.foodCategory.update.mockResolvedValue(updatedCategory);

      const result = await repository.update('cat-123', updateDto);

      expect(prisma.foodCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: updateDto,
      });
      expect(result.foodName).toBe('Tomato, cooked');
      expect(result.energyKcal).toBe(20);
    });

    it('should update only provided fields', async () => {
      const updateDto: UpdateFoodCategoryDto = {
        energyKcal: 25,
      };

      prisma.foodCategory.update.mockResolvedValue({
        ...mockCategory,
        energyKcal: 25,
      });

      const result = await repository.update('cat-123', updateDto);

      expect(prisma.foodCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: updateDto,
      });
      expect(result.energyKcal).toBe(25);
    });
  });

  describe('delete', () => {
    it('should delete a food category', async () => {
      prisma.foodCategory.delete.mockResolvedValue(mockCategory);

      const result = await repository.delete('cat-123');

      expect(prisma.foodCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findByNevoCode', () => {
    it('should return a food category by NEVO code', async () => {
      prisma.foodCategory.findUnique.mockResolvedValue(mockCategory);

      const result = await repository.findByNevoCode(1234);

      expect(prisma.foodCategory.findUnique).toHaveBeenCalledWith({
        where: { nevoCode: 1234 },
      });
      expect(result).toEqual(mockCategory);
      expect(result?.nevoCode).toBe(1234);
    });

    it('should return null when NEVO code not found', async () => {
      prisma.foodCategory.findUnique.mockResolvedValue(null);

      const result = await repository.findByNevoCode(9999);

      expect(result).toBeNull();
    });
  });

  describe('getAllFoodGroups', () => {
    it('should return all unique food groups sorted alphabetically', async () => {
      const mockGroups = [
        { foodGroup: 'Cereals' },
        { foodGroup: 'Dairy' },
        { foodGroup: 'Vegetables' },
        { foodGroup: 'Fruits' },
      ];

      prisma.foodCategory.findMany.mockResolvedValue(mockGroups as any);

      const result = await repository.getAllFoodGroups();

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: {},
        select: { foodGroup: true },
        distinct: ['foodGroup'],
        orderBy: { foodGroup: 'asc' },
      });
      expect(result).toEqual(['Cereals', 'Dairy', 'Vegetables', 'Fruits']);
      expect(result).toHaveLength(4);
    });

    it('should filter food groups by search term', async () => {
      const mockGroups = [
        { foodGroup: 'Vegetables' },
        { foodGroup: 'Vegetable oils' },
      ];

      prisma.foodCategory.findMany.mockResolvedValue(mockGroups as any);

      const result = await repository.getAllFoodGroups('vegeta');

      expect(prisma.foodCategory.findMany).toHaveBeenCalledWith({
        where: { foodGroup: { contains: 'vegeta', mode: 'insensitive' } },
        select: { foodGroup: true },
        distinct: ['foodGroup'],
        orderBy: { foodGroup: 'asc' },
      });
      expect(result).toEqual(['Vegetables', 'Vegetable oils']);
    });

    it('should return empty array when no categories exist', async () => {
      prisma.foodCategory.findMany.mockResolvedValue([]);

      const result = await repository.getAllFoodGroups();

      expect(result).toEqual([]);
    });

    it('should not include duplicate food groups', async () => {
      const mockGroups = [{ foodGroup: 'Vegetables' }, { foodGroup: 'Fruits' }];

      prisma.foodCategory.findMany.mockResolvedValue(mockGroups as any);

      const result = await repository.getAllFoodGroups();

      // Prisma's distinct ensures uniqueness
      expect(result).toHaveLength(2);
    });
  });
});
