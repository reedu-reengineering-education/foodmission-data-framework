import { Test, TestingModule } from '@nestjs/testing';
import { MealService } from './meal.service';
import { MealRepository } from '../repositories/meal.repository';
import { PantryItemRepository } from '../../pantryItem/repositories/pantryItem.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MealType } from '@prisma/client';

describe('MealService', () => {
  let service: MealService;
  const userId = 'user-1';

  const mockMealRepository = {
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
        MealService,
        { provide: MealRepository, useValue: mockMealRepository },
        { provide: PantryItemRepository, useValue: mockPantryItemRepository },
      ],
    }).compile();

    service = module.get<MealService>(MealService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw ConflictException when barcode already exists', async () => {
    mockMealRepository.findByBarcode.mockResolvedValue({ id: 'm1' });

    await expect(
      service.create(
        {
          name: 'Meal',
          mealType: MealType.MEAT,
          barcode: '111',
        },
        userId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should validate pantry ownership on create', async () => {
    mockMealRepository.findByBarcode.mockResolvedValue(null);
    mockPantryItemRepository.findById.mockResolvedValue({
      id: 'p1',
      pantry: { userId: 'other' },
    });

    await expect(
      service.create(
        {
          name: 'Meal',
          mealType: MealType.MEAT,
          pantryItemId: 'p1',
        },
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create meal when data valid', async () => {
    const meal = {
      id: 'm1',
      name: 'Meal',
      mealType: MealType.MEAT,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMealRepository.findByBarcode.mockResolvedValue(null);
    mockPantryItemRepository.findById.mockResolvedValue(null);
    mockMealRepository.create.mockResolvedValue(meal);

    const result = await service.create(
      { name: 'Meal', mealType: MealType.MEAT },
      userId,
    );

    expect(result.id).toBe('m1');
    expect(mockMealRepository.create).toHaveBeenCalledWith({
      name: 'Meal',
      mealType: MealType.MEAT,
      userId,
    });
  });

  it('should enforce ownership on update', async () => {
    const meal = {
      id: 'm1',
      name: 'Meal',
      mealType: MealType.MEAT,
      userId: 'other',
    };
    mockMealRepository.findById.mockResolvedValue(meal);

    await expect(service.update('m1', { name: 'New' }, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw NotFound when meal missing on update', async () => {
    mockMealRepository.findById.mockResolvedValue(null);

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
    mockMealRepository.findWithPagination.mockResolvedValue(paginationResult);

    await service.findAll(userId, {
      mealType: MealType.MEAT,
      search: 'chick',
      page: 2,
      limit: 5,
    } as any);

    expect(mockMealRepository.findWithPagination).toHaveBeenCalledWith({
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
