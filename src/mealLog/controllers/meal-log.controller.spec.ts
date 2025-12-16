import { Test, TestingModule } from '@nestjs/testing';
import { MealLogController } from './meal-log.controller';
import { MealLogService } from '../services/meal-log.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { MealType, TypeOfMeal } from '@prisma/client';

describe('MealLogController', () => {
  let controller: MealLogController;
  let service: jest.Mocked<MealLogService>;

  const mockLog = {
    id: 'log-1',
    mealId: 'meal-1',
    userId: 'user-1',
    typeOfMeal: TypeOfMeal.DINNER,
    timestamp: new Date(),
    mealFromPantry: false,
    eatenOut: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockMealLogService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealLogController],
      providers: [{ provide: MealLogService, useValue: mockMealLogService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MealLogController>(MealLogController);
    service = module.get(MealLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should delegate to service', async () => {
    service.create.mockResolvedValueOnce(mockLog as any);
    const dto = { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER };
    const result = await controller.create(dto as any, 'user-1');

    expect(result).toEqual(mockLog);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('findAll should pass filters and user id', async () => {
    const query = { mealType: MealType.MEAT, mealFromPantry: true, page: 2 };
    service.findAll.mockResolvedValueOnce({ data: [mockLog], total: 1 } as any);

    const result = await controller.findAll('user-1', query as any);

    expect(result).toEqual({ data: [mockLog], total: 1 });
    expect(service.findAll).toHaveBeenCalledWith('user-1', query);
  });

  it('findOne should fetch by id', async () => {
    service.findOne.mockResolvedValueOnce(mockLog as any);
    const result = await controller.findOne('log-1', 'user-1');
    expect(result).toEqual(mockLog);
    expect(service.findOne).toHaveBeenCalledWith('log-1', 'user-1');
  });

  it('update should send dto', async () => {
    service.update.mockResolvedValueOnce({ ...mockLog, eatenOut: true } as any);
    const dto = { eatenOut: true };
    const result = await controller.update('log-1', dto as any, 'user-1');

    expect(result.eatenOut).toBe(true);
    expect(service.update).toHaveBeenCalledWith('log-1', dto, 'user-1');
  });

  it('remove should delegate', async () => {
    service.remove.mockResolvedValueOnce(undefined);
    await controller.remove('log-1', 'user-1');
    expect(service.remove).toHaveBeenCalledWith('log-1', 'user-1');
  });
});
