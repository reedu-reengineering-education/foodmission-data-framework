import { Test, TestingModule } from '@nestjs/testing';
import { DishController } from './dish.controller';
import { DishService } from '../services/dish.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { MealType } from '@prisma/client';

describe('DishController', () => {
  let controller: DishController;
  let service: jest.Mocked<DishService>;

  const mockDish = {
    id: 'dish-1',
    name: 'Test dish',
    mealType: MealType.MEAT,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockDishService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DishController],
      providers: [{ provide: DishService, useValue: mockDishService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DishController>(DishController);
    service = module.get(DishService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should delegate to service with user id', async () => {
    service.create.mockResolvedValueOnce(mockDish as any);
    const dto = { name: 'New', mealType: MealType.MEAT };
    const result = await controller.create(dto as any, 'user-1');
    expect(result).toEqual(mockDish);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('findAll should pass query and user id', async () => {
    const query = { mealType: MealType.MEAT, search: 'chick', page: 2 };
    service.findAll.mockResolvedValueOnce({
      data: [mockDish],
      total: 1,
    } as any);

    const result = await controller.findAll('user-1', query as any);

    expect(result).toEqual({ data: [mockDish], total: 1 });
    expect(service.findAll).toHaveBeenCalledWith('user-1', query);
  });

  it('findOne should fetch a dish by id', async () => {
    service.findOne.mockResolvedValueOnce(mockDish as any);
    const result = await controller.findOne('dish-1', 'user-1');
    expect(result).toEqual(mockDish);
    expect(service.findOne).toHaveBeenCalledWith('dish-1', 'user-1');
  });

  it('update should pass dto and user id', async () => {
    service.update.mockResolvedValueOnce({
      ...mockDish,
      name: 'Updated',
    } as any);
    const dto = { name: 'Updated' };
    const result = await controller.update('dish-1', dto as any, 'user-1');

    expect(result.name).toBe('Updated');
    expect(service.update).toHaveBeenCalledWith('dish-1', dto, 'user-1');
  });

  it('remove should call service remove', async () => {
    service.remove.mockResolvedValueOnce(undefined);
    await controller.remove('dish-1', 'user-1');
    expect(service.remove).toHaveBeenCalledWith('dish-1', 'user-1');
  });
});
