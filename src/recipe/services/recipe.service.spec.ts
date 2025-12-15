import { Test, TestingModule } from '@nestjs/testing';
import { RecipeService } from './recipe.service';
import { RecipeRepository } from '../repositories/recipe.repository';
import { DishRepository } from '../../dish/repositories/dish.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MealType } from '@prisma/client';

describe('RecipeService', () => {
  let service: RecipeService;
  const userId = 'user-1';

  const mockRecipeRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDishRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeService,
        { provide: RecipeRepository, useValue: mockRecipeRepository },
        { provide: DishRepository, useValue: mockDishRepository },
      ],
    }).compile();

    service = module.get<RecipeService>(RecipeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFound when dish is missing on create', async () => {
    mockDishRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(
        {
          dishId: 'd1',
          title: 'R',
        } as any,
        userId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce dish ownership on create', async () => {
    mockDishRepository.findById.mockResolvedValue({
      id: 'd1',
      userId: 'other',
    });

    await expect(
      service.create(
        {
          dishId: 'd1',
          title: 'R',
        } as any,
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create recipe when dish owned by user', async () => {
    const recipe = {
      id: 'r1',
      dishId: 'd1',
      userId,
      title: 'R',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDishRepository.findById.mockResolvedValue({ id: 'd1', userId });
    mockRecipeRepository.create.mockResolvedValue(recipe);

    const result = await service.create(
      { dishId: 'd1', title: 'R' } as any,
      userId,
    );

    expect(result.id).toBe('r1');
    expect(mockRecipeRepository.create).toHaveBeenCalledWith({
      dishId: 'd1',
      title: 'R',
      userId,
    });
  });

  it('should throw NotFound on update when recipe missing', async () => {
    mockRecipeRepository.findById.mockResolvedValue(null);

    await expect(
      service.update('missing', { title: 'X' }, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce ownership on remove', async () => {
    mockRecipeRepository.findById.mockResolvedValue({
      id: 'r1',
      userId: 'other',
    });

    await expect(service.remove('r1', userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should build filters for findAll and trim tags', async () => {
    const paginationResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    mockRecipeRepository.findWithPagination.mockResolvedValue(paginationResult);

    await service.findAll(userId, {
      mealType: MealType.MEAT,
      tags: [' quick '],
      allergens: [' nuts '],
      difficulty: 'easy',
      search: 'pasta',
      page: 2,
      limit: 5,
    } as any);

    expect(mockRecipeRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      where: {
        userId,
        difficulty: 'easy',
        tags: { hasSome: ['quick'] },
        allergens: { hasSome: ['nuts'] },
        title: { contains: 'pasta', mode: 'insensitive' },
        dish: { mealType: MealType.MEAT },
      },
      orderBy: { createdAt: 'desc' },
      include: { dish: true },
    });
  });

  it('should ensure ownership when changing dish on update', async () => {
    mockRecipeRepository.findById.mockResolvedValue({
      id: 'r1',
      dishId: 'd-old',
      userId,
    });
    mockDishRepository.findById.mockResolvedValue({
      id: 'd2',
      userId: 'other',
    });

    await expect(
      service.update('r1', { dishId: 'd2' } as any, userId),
    ).rejects.toThrow(ForbiddenException);
  });
});
