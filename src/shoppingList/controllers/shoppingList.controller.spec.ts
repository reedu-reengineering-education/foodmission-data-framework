import { Test, TestingModule } from '@nestjs/testing';
import { ShoppingListController } from './shoppingList.controller';
import { ShoppingListService } from '../services/shoppingList.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

describe('ShoppingListController', () => {
  let controller: ShoppingListController;
  let shoppingListService: jest.Mocked<ShoppingListService>;

  const mockShoppingListResponse = {
    id: 'list-1',
    title: 'Test Shopping List',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  let dataBaseAuthGuard: { canActivate: jest.Mock };

  beforeEach(async () => {
    const mockShoppingListService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    dataBaseAuthGuard = { canActivate: jest.fn(() => true) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListController],
      providers: [
        {
          provide: ShoppingListService,
          useValue: mockShoppingListService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue(dataBaseAuthGuard)
      .compile();
    // ...existing code...

    controller = module.get<ShoppingListController>(ShoppingListController);
    shoppingListService = module.get(ShoppingListService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service with correct parameters and return result', async () => {
      const createDto = { title: 'New List' };
      const userId = 'user-1';
      shoppingListService.create.mockResolvedValueOnce(
        mockShoppingListResponse,
      );

      const result = await controller.create(createDto, userId);

      expect(result).toEqual(mockShoppingListResponse);
      expect(shoppingListService.create).toHaveBeenCalledWith(
        createDto,
        userId,
      );
    });
  });

  describe('findAll', () => {
    it('should call service with userId and return result', async () => {
      const mockResponse = {
        data: [mockShoppingListResponse],
      };
      const userId = 'user-1';
      shoppingListService.findAll.mockResolvedValueOnce(mockResponse);

      const result = await controller.findAll(userId);

      expect(result).toEqual(mockResponse);
      expect(shoppingListService.findAll).toHaveBeenCalledWith(userId);
    });
  });

  describe('findById', () => {
    it('should call service with correct parameters and return result', async () => {
      const id = 'list-1';
      const userId = 'user-1';
      shoppingListService.findById.mockResolvedValueOnce(
        mockShoppingListResponse,
      );

      const result = await controller.findById(id, userId);

      expect(result).toEqual(mockShoppingListResponse);
      expect(shoppingListService.findById).toHaveBeenCalledWith(id, userId);
    });
  });

  describe('findItems', () => {
    it('should call service with id, userId, and filters', async () => {
      // TODO: Implement or remove this test if not needed
    });
  });

  describe('update', () => {
    it('should call service with correct parameters and return result', async () => {
      const id = 'list-1';
      const updateDto = { title: 'Updated List' };
      const userId = 'user-1';
      shoppingListService.update.mockResolvedValueOnce({
        ...mockShoppingListResponse,
        title: 'Updated List',
        items: [],
      });

      const result = await controller.update(id, updateDto, userId);

      expect(result.title).toBe('Updated List');
      expect(shoppingListService.update).toHaveBeenCalledWith(
        id,
        updateDto,
        userId,
      );
    });
  });

  describe('remove', () => {
    it('should call service with correct parameters', async () => {
      const id = 'list-1';
      const userId = 'user-1';
      shoppingListService.remove.mockResolvedValueOnce(undefined);

      await controller.remove(id, userId);

      expect(shoppingListService.remove).toHaveBeenCalledWith(id, userId);
    });

    it('should propagate NotFoundException from service', async () => {
      const id = 'non-existent';
      const userId = 'user-1';
      shoppingListService.remove.mockRejectedValueOnce(
        new NotFoundException('Shopping list not found'),
      );

      await expect(controller.remove(id, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(shoppingListService.remove).toHaveBeenCalledWith(id, userId);
    });

    it('should propagate ForbiddenException from service', async () => {
      const id = 'list-1';
      const userId = 'user-1';
      shoppingListService.remove.mockRejectedValueOnce(
        new ForbiddenException('No permission'),
      );

      await expect(controller.remove(id, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(shoppingListService.remove).toHaveBeenCalledWith(id, userId);
    });
  });
});
