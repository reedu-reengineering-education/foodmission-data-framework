import { Test, TestingModule } from '@nestjs/testing';
import { RecipeController } from './recipe.controller';
import { RecipeService } from '../services/recipe.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { MealType } from '@prisma/client';

describe('RecipeController', () => {
  let controller: RecipeController;
  let service: jest.Mocked<RecipeService>;

  const mockRecipe = {
    id: 'recipe-1',
    dishId: 'dish-1',
    title: 'Test recipe',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRecipeService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipeController],
      providers: [{ provide: RecipeService, useValue: mockRecipeService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RecipeController>(RecipeController);
    service = module.get(RecipeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should delegate with user id', async () => {
    service.create.mockResolvedValueOnce(mockRecipe as any);
    const dto = { dishId: 'dish-1', title: 'R' };
    const result = await controller.create(dto as any, 'user-1');

    expect(result).toEqual(mockRecipe);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('findAll should pass filters and user id', async () => {
    const query = { mealType: MealType.MEAT, tags: ['vegan'], page: 1 };
    service.findAll.mockResolvedValueOnce({
      data: [mockRecipe],
      total: 1,
    } as any);

    const result = await controller.findAll('user-1', query as any);

    expect(result).toEqual({ data: [mockRecipe], total: 1 });
    expect(service.findAll).toHaveBeenCalledWith('user-1', query);
  });

  it('findOne should retrieve recipe', async () => {
    service.findOne.mockResolvedValueOnce(mockRecipe as any);
    const result = await controller.findOne('recipe-1', 'user-1');
    expect(result).toEqual(mockRecipe);
    expect(service.findOne).toHaveBeenCalledWith('recipe-1', 'user-1');
  });

  it('update should call service with id/dto/user', async () => {
    service.update.mockResolvedValueOnce({
      ...mockRecipe,
      title: 'New',
    } as any);
    const dto = { title: 'New' };
    const result = await controller.update('recipe-1', dto as any, 'user-1');
    expect(result.title).toBe('New');
    expect(service.update).toHaveBeenCalledWith('recipe-1', dto, 'user-1');
  });

  it('remove should delegate to service', async () => {
    service.remove.mockResolvedValueOnce(undefined);
    await controller.remove('recipe-1', 'user-1');
    expect(service.remove).toHaveBeenCalledWith('recipe-1', 'user-1');
  });
});
