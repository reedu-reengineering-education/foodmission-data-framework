import { Test, TestingModule } from '@nestjs/testing';
import { DishService } from './dish.service';
import { DishRepository } from '../repositories/dish.repository';
import { PantryItemRepository } from '../../pantryItem/repositories/pantryItem.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MealType } from '@prisma/client';

describe('DishService', () => {
  let service: DishService;
  const userId = 'user-1';

  const mockDishRepository = {
    findByBarcode: jest.fn(),
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPantryItemRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DishService,
        { provide: DishRepository, useValue: mockDishRepository },
        { provide: PantryItemRepository, useValue: mockPantryItemRepository },
      ],
    }).compile();

    service = module.get<DishService>(DishService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw ConflictException when barcode already exists', async () => {
    mockDishRepository.findByBarcode.mockResolvedValue({ id: 'd1' });

    await expect(
      service.create(
        {
          name: 'Dish',
          mealType: MealType.MEAT,
          barcode: '111',
        },
        userId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should validate pantry ownership on create', async () => {
    mockDishRepository.findByBarcode.mockResolvedValue(null);
    mockPantryItemRepository.findById.mockResolvedValue({
      id: 'p1',
      pantry: { userId: 'other' },
    });

    await expect(
      service.create(
        {
          name: 'Dish',
          mealType: MealType.MEAT,
          pantryItemId: 'p1',
        },
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create dish when data valid', async () => {
    const dish = {
      id: 'd1',
      name: 'Dish',
      mealType: MealType.MEAT,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDishRepository.findByBarcode.mockResolvedValue(null);
    mockPantryItemRepository.findById.mockResolvedValue(null);
    mockDishRepository.create.mockResolvedValue(dish);

    const result = await service.create(
      { name: 'Dish', mealType: MealType.MEAT },
      userId,
    );

    expect(result.id).toBe('d1');
    expect(mockDishRepository.create).toHaveBeenCalledWith({
      name: 'Dish',
      mealType: MealType.MEAT,
      userId,
    });
  });

  it('should enforce ownership on update', async () => {
    const dish = {
      id: 'd1',
      name: 'Dish',
      mealType: MealType.MEAT,
      userId: 'other',
    };
    mockDishRepository.findById.mockResolvedValue(dish);

    await expect(service.update('d1', { name: 'New' }, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw NotFound when dish missing on update', async () => {
    mockDishRepository.findById.mockResolvedValue(null);

    await expect(
      service.update('missing', { name: 'New' }, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should build filters for findAll', async () => {
    const paginationResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    mockDishRepository.findWithPagination.mockResolvedValue(paginationResult);

    await service.findAll(userId, {
      mealType: MealType.MEAT,
      search: 'chick',
      page: 2,
      limit: 5,
    } as any);

    expect(mockDishRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      where: {
        userId,
        mealType: MealType.MEAT,
        name: { contains: 'chick', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
