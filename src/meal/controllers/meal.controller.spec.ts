import { Test, TestingModule } from '@nestjs/testing';
import { MealController } from './meal.controller';
import { MealService } from '../services/meal.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { MealType } from '@prisma/client';

describe('MealController', () => {
  let controller: MealController;
  let service: jest.Mocked<MealService>;

  const mockMeal = {
    id: 'meal-1',
    name: 'Test meal',
    mealType: MealType.MEAT,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockMealService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealController],
      providers: [{ provide: MealService, useValue: mockMealService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MealController>(MealController);
    service = module.get(MealService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should delegate to service with user id', async () => {
    service.create.mockResolvedValueOnce(mockMeal as any);
    const dto = { name: 'New', mealType: MealType.MEAT };
    const result = await controller.create(dto as any, 'user-1');
    expect(result).toEqual(mockMeal);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('findAll should pass query and user id', async () => {
    const query = { mealType: MealType.MEAT, search: 'chick', page: 2 };
    service.findAll.mockResolvedValueOnce({
      data: [mockMeal],
      total: 1,
    } as any);

    const result = await controller.findAll('user-1', query as any);

    expect(result).toEqual({ data: [mockMeal], total: 1 });
    expect(service.findAll).toHaveBeenCalledWith('user-1', query);
  });

  it('findOne should fetch a meal by id', async () => {
    service.findOne.mockResolvedValueOnce(mockMeal as any);
    const result = await controller.findOne('meal-1', 'user-1');
    expect(result).toEqual(mockMeal);
    expect(service.findOne).toHaveBeenCalledWith('meal-1', 'user-1');
  });

  it('update should pass dto and user id', async () => {
    service.update.mockResolvedValueOnce({
      ...mockMeal,
      name: 'Updated',
    } as any);
    const dto = { name: 'Updated' };
    const result = await controller.update('meal-1', dto as any, 'user-1');

    expect(result.name).toBe('Updated');
    expect(service.update).toHaveBeenCalledWith('meal-1', dto, 'user-1');
  });

  it('remove should call service remove', async () => {
    service.remove.mockResolvedValueOnce(undefined);
    await controller.remove('meal-1', 'user-1');
    expect(service.remove).toHaveBeenCalledWith('meal-1', 'user-1');
  });
});
