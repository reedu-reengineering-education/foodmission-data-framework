import { Test, TestingModule } from '@nestjs/testing';
import { RecipeService } from './recipe.service';
import { RecipeRepository } from '../repositories/recipe.repository';
import { MealRepository } from '../../meal/repositories/meal.repository';
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

  const mockMealRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeService,
        { provide: RecipeRepository, useValue: mockRecipeRepository },
        { provide: MealRepository, useValue: mockMealRepository },
      ],
    }).compile();

    service = module.get<RecipeService>(RecipeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw NotFound when meal is missing on create', async () => {
    mockMealRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(
        {
          mealId: 'm1',
          title: 'R',
        } as any,
        userId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce meal ownership on create', async () => {
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId: 'other',
    });

    await expect(
      service.create(
        {
          mealId: 'm1',
          title: 'R',
        } as any,
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create recipe when meal owned by user', async () => {
    const recipe = {
      id: 'r1',
      mealId: 'm1',
      userId,
      title: 'R',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMealRepository.findById.mockResolvedValue({ id: 'm1', userId });
    mockRecipeRepository.create.mockResolvedValue(recipe);

    const result = await service.create(
      { mealId: 'm1', title: 'R' } as any,
      userId,
    );

    expect(result.id).toBe('r1');
    expect(mockRecipeRepository.create).toHaveBeenCalledWith({
      mealId: 'm1',
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
        meal: { mealType: MealType.MEAT },
      },
      orderBy: { createdAt: 'desc' },
      include: { meal: true },
    });
  });

  it('should ensure ownership when changing meal on update', async () => {
    mockRecipeRepository.findById.mockResolvedValue({
      id: 'r1',
      mealId: 'm-old',
      userId,
    });
    mockMealRepository.findById.mockResolvedValue({
      id: 'm2',
      userId: 'other',
    });

    await expect(
      service.update('r1', { mealId: 'm2' } as any, userId),
    ).rejects.toThrow(ForbiddenException);
  });
});
