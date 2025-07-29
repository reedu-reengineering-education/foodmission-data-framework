/**
 * Food Integration Tests
 * Tests database operations and repository layer
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { FoodRepository } from '../src/food/repositories/food.repository';
import { FoodCategoryRepository } from '../src/food/repositories/food-category.repository';
import { CreateFoodDto } from '../src/food/dto/create-food.dto';
import { UpdateFoodDto } from '../src/food/dto/update-food.dto';
import { FoodCategory } from '@prisma/client';

describe('Food Integration Tests', () => {
  let prisma: PrismaService;
  let foodRepository: FoodRepository;
  let categoryRepository: FoodCategoryRepository;
  let testCategory: FoodCategory;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, FoodRepository, FoodCategoryRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    foodRepository = module.get<FoodRepository>(FoodRepository);
    categoryRepository = module.get<FoodCategoryRepository>(
      FoodCategoryRepository,
    );

    // Create test category
    testCategory = await prisma.foodCategory.create({
      data: {
        name: 'Integration-Test-Category',
        description: 'Category for integration tests',
      },
    });
  });

  beforeEach(async () => {
    // Clean up foods before each test
    await prisma.food.deleteMany({
      where: {
        categoryId: testCategory.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.food.deleteMany({
      where: {
        categoryId: testCategory.id,
      },
    });
    await prisma.foodCategory.delete({
      where: {
        id: testCategory.id,
      },
    });
    await prisma.$disconnect();
  });

  describe('FoodRepository', () => {
    describe('create', () => {
      it('should create a new food item', async () => {
        const createDto: CreateFoodDto = {
          name: 'Integration Test Food',
          description: 'Test food for integration testing',
          barcode: 'INT123456789',
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        };

        const result = await foodRepository.create(createDto);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(createDto.name);
        expect(result.description).toBe(createDto.description);
        expect(result.barcode).toBe(createDto.barcode);
        expect(result.categoryId).toBe(createDto.categoryId);
        expect(result.createdBy).toBe(createDto.createdBy);
        expect(result.createdAt).toBeValidDate();
        expect(result.updatedAt).toBeValidDate();
      });

      it('should create food without optional fields', async () => {
        const createDto: CreateFoodDto = {
          name: 'Minimal Food',
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        };

        const result = await foodRepository.create(createDto);

        expect(result).toBeDefined();
        expect(result.name).toBe(createDto.name);
        expect(result.description).toBeNull();
        expect(result.barcode).toBeNull();
        expect(result.openFoodFactsId).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find food by id with category', async () => {
        const createDto: CreateFoodDto = {
          name: 'Find By ID Test',
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        };

        const created = await foodRepository.create(createDto);
        const found = await foodRepository.findById(created.id);

        expect(found).toBeDefined();
        expect(found!.id).toBe(created.id);
        expect(found!.categoryId).toBeDefined();
        expect(found!.categoryId).toBe(testCategory.id);
      });

      it('should return null for non-existent id', async () => {
        const found = await foodRepository.findById('non-existent-id');
        expect(found).toBeNull();
      });
    });

    describe('findByBarcode', () => {
      it('should find food by barcode', async () => {
        const barcode = 'BARCODE123456';
        const createDto: CreateFoodDto = {
          name: 'Barcode Test Food',
          barcode,
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        };

        await foodRepository.create(createDto);
        const found = await foodRepository.findByBarcode(barcode);

        expect(found).toBeDefined();
        expect(found!.barcode).toBe(barcode);
        expect(found!.categoryId).toBeDefined();
      });

      it('should return null for non-existent barcode', async () => {
        const found = await foodRepository.findByBarcode(
          'non-existent-barcode',
        );
        expect(found).toBeNull();
      });
    });

    describe('findWithPagination', () => {
      beforeEach(async () => {
        // Create test foods
        const foods = [
          { name: 'Apple Juice', description: 'Fresh apple juice' },
          { name: 'Orange Juice', description: 'Fresh orange juice' },
          { name: 'Grape Juice', description: 'Fresh grape juice' },
          { name: 'Tomato Soup', description: 'Homemade tomato soup' },
          { name: 'Chicken Soup', description: 'Homemade chicken soup' },
        ];

        for (const food of foods) {
          await foodRepository.create({
            ...food,
            categoryId: testCategory.id,
            createdBy: 'integration-test-user',
          });
        }
      });

      it('should return paginated results', async () => {
        const result = await foodRepository.findWithPagination({
          skip: 0,
          take: 3,
        });

        expect(result).toBeDefined();
        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(5);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(3);
        expect(result.totalPages).toBe(2);
      });

      it('should filter by search term', async () => {
        const result = await foodRepository.findWithPagination({
          skip: 0,
          take: 10,
          where: {
            name: {
              contains: 'juice',
              mode: 'insensitive',
            },
          },
        });

        expect(result.data).toHaveLength(3);
        expect(
          result.data.every((food) =>
            food.name.toLowerCase().includes('juice'),
          ),
        ).toBe(true);
      });

      it('should sort results', async () => {
        const result = await foodRepository.findWithPagination({
          skip: 0,
          take: 10,
          orderBy: { name: 'desc' },
        });

        const names = result.data.map((food) => food.name);
        const sortedNames = [...names].sort().reverse();
        expect(names).toEqual(sortedNames);
      });
    });

    describe('update', () => {
      it('should update food item', async () => {
        const createDto: CreateFoodDto = {
          name: 'Original Name',
          description: 'Original description',
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        };

        const created = await foodRepository.create(createDto);

        const updateDto: UpdateFoodDto = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        const updated = await foodRepository.update(created.id, updateDto);

        expect(updated).toBeDefined();
        expect(updated.name).toBe(updateDto.name);
        expect(updated.description).toBe(updateDto.description);
        expect(updated.updatedAt.getTime()).toBeGreaterThan(
          created.updatedAt.getTime(),
        );
      });
    });

    describe('delete', () => {
      it('should delete food item', async () => {
        const createDto: CreateFoodDto = {
          name: 'To Be Deleted',
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        };

        const created = await foodRepository.create(createDto);
        await foodRepository.delete(created.id);

        const found = await foodRepository.findById(created.id);
        expect(found).toBeNull();
      });
    });

    describe('count', () => {
      it('should count all foods', async () => {
        // Create 3 test foods
        for (let i = 0; i < 3; i++) {
          await foodRepository.create({
            name: `Count Test Food ${i}`,
            categoryId: testCategory.id,
            createdBy: 'integration-test-user',
          });
        }

        const count = await foodRepository.count();
        expect(count).toBeGreaterThanOrEqual(3);
      });

      it('should count with filter', async () => {
        await foodRepository.create({
          name: 'Filtered Food',
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        });

        const count = await foodRepository.count({
          name: {
            contains: 'Filtered',
            mode: 'insensitive',
          },
        });

        expect(count).toBe(1);
      });
    });
  });

  describe('FoodCategoryRepository', () => {
    describe('findById', () => {
      it('should find category by id', async () => {
        const found = await categoryRepository.findById(testCategory.id);

        expect(found).toBeDefined();
        expect(found!.id).toBe(testCategory.id);
        expect(found!.name).toBe(testCategory.name);
        expect(found!.description).toBe(testCategory.description);
      });

      it('should return null for non-existent id', async () => {
        const found = await categoryRepository.findById('non-existent-id');
        expect(found).toBeNull();
      });
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique barcode constraint', async () => {
      const barcode = 'UNIQUE123456';

      await foodRepository.create({
        name: 'First Food',
        barcode,
        categoryId: testCategory.id,
        createdBy: 'integration-test-user',
      });

      await expect(
        foodRepository.create({
          name: 'Second Food',
          barcode,
          categoryId: testCategory.id,
          createdBy: 'integration-test-user',
        }),
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraint for category', async () => {
      await expect(
        foodRepository.create({
          name: 'Invalid Category Food',
          categoryId: 'non-existent-category-id',
          createdBy: 'integration-test-user',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Transactions', () => {
    it('should rollback on error', async () => {
      const initialCount = await foodRepository.count();

      try {
        await prisma.$transaction(async (tx) => {
          // Create a food
          await tx.food.create({
            data: {
              name: 'Transaction Test Food',
              categoryId: testCategory.id,
              createdBy: 'integration-test-user',
            },
          });

          // Force an error
          throw new Error('Forced transaction error');
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Expected error
      }

      const finalCount = await foodRepository.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
