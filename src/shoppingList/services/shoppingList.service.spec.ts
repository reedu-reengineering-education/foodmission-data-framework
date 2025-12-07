import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ShoppingListService } from './shoppingList.service';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';
import { ShoppingListItemRepository } from '../../shoppingListItem/repositories/shoppingListItem.repository';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ERROR_CODES } from '../../common/utils/error.utils';

describe('ShoppingListService', () => {
  let service: ShoppingListService;
  let shoppingListRepository: jest.Mocked<ShoppingListRepository>;
  // ShoppingListItemRepository is provided for DI completeness but not used directly here.

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test Shopping List',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockShoppingListArray = [
    mockShoppingList,
    {
      id: 'list-2',
      title: 'Second List',
      userId: 'user-2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const mockItemRepository = {
      findByShoppingListId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListService,
        {
          provide: ShoppingListRepository,
          useValue: mockRepository,
        },
        {
          provide: ShoppingListItemRepository,
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    service = module.get<ShoppingListService>(ShoppingListService);
    shoppingListRepository = module.get(ShoppingListRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a shopping list successfully', async () => {
      const createDto: CreateShoppingListDto = {
        title: 'Test Shopping List',
      };
      const userId = 'user-1';

      shoppingListRepository.create.mockResolvedValue(mockShoppingList);

      const result = await service.create(createDto, userId);

      expect(shoppingListRepository.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockShoppingList.id,
        title: mockShoppingList.title,
        createdAt: mockShoppingList.createdAt,
        updatedAt: mockShoppingList.updatedAt,
      });
    });

    it('should throw ConflictException when duplicate title', async () => {
      const createDto: CreateShoppingListDto = {
        title: 'Duplicate Title',
      };
      const userId = 'user-1';

      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT,
          clientVersion: '4.0.0',
          meta: { target: ['userId', 'title'] },
        },
      );
      shoppingListRepository.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, userId)).rejects.toThrow(
        'Shopping list with this title already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return all shopping lists', async () => {
      shoppingListRepository.findAll.mockResolvedValue(mockShoppingListArray);

      const result = await service.findAll();

      expect(shoppingListRepository.findAll).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBe('Test Shopping List');
    });
  });

  describe('findById', () => {
    it('should return shopping list by id when user is owner', async () => {
      const listId = 'list-1';
      const userId = 'user-1';
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      const result = await service.findById(listId, userId);

      expect(shoppingListRepository.findById).toHaveBeenCalled();
      expect(result.id).toBe(mockShoppingList.id);
    });

    it('should throw NotFoundException when shopping list does not exist', async () => {
      const listId = 'non-existent-id';
      const userId = 'user-1';
      shoppingListRepository.findById.mockResolvedValue(null);

      await expect(service.findById(listId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(listId, userId)).rejects.toThrow(
        'Shopping list dosent exist',
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const listId = 'list-1';
      const differentUserId = 'user-2';
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      await expect(service.findById(listId, differentUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update shopping list successfully when user is owner', async () => {
      const listId = 'list-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListDto = {
        title: 'Updated Title',
      };
      const updatedList = { ...mockShoppingList, title: 'Updated Title' };

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      shoppingListRepository.update.mockResolvedValue(updatedList);

      const result = await service.update(listId, updateDto, userId);

      expect(shoppingListRepository.findById).toHaveBeenCalled();
      expect(shoppingListRepository.update).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException when shopping list does not exist', async () => {
      const listId = 'non-existent-id';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListDto = { title: 'New Title' };

      shoppingListRepository.findById.mockResolvedValue(null);

      await expect(service.update(listId, updateDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const listId = 'list-1';
      const differentUserId = 'user-2';
      const updateDto: UpdateShoppingListDto = { title: 'New Title' };

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      await expect(
        service.update(listId, updateDto, differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete shopping list successfully when user is owner', async () => {
      const listId = 'list-1';
      const userId = 'user-1';

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      await service.remove(listId, userId);

      expect(shoppingListRepository.findById).toHaveBeenCalled();
      expect(shoppingListRepository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when shopping list does not exist', async () => {
      const listId = 'non-existent-id';
      const userId = 'user-1';

      shoppingListRepository.findById.mockResolvedValue(null);

      await expect(service.remove(listId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const listId = 'list-1';
      const differentUserId = 'user-2';

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      await expect(service.remove(listId, differentUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('transformToResponseDto', () => {
    it('should transform data correctly (tested through create method)', async () => {
      const createDto: CreateShoppingListDto = {
        title: 'Test List',
      };
      const userId = 'user-1';

      shoppingListRepository.create.mockResolvedValue(mockShoppingList);

      const result = await service.create(createDto, userId);

      expect(result).toEqual({
        id: mockShoppingList.id,
        title: mockShoppingList.title,
        createdAt: mockShoppingList.createdAt,
        updatedAt: mockShoppingList.updatedAt,
      });
    });
  });
});
