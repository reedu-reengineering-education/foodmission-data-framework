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
  let shoppingListItemRepository: jest.Mocked<ShoppingListItemRepository>;

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

  // SCHRITT 1: Test-Setup
  // beforeEach läuft vor jedem Test und bereitet unser Test-Modul vor
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

    // NestJS Test-Modul erstellen - das ist wie eine Mini-Version unserer App nur für Tests
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListService,
        {
          provide: ShoppingListRepository,
          useValue: mockRepository, // Verwende unser Mock statt dem echten Repository
        },
        {
          provide: ShoppingListItemRepository,
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    // Service und Repository aus dem Test-Modul holen
    service = module.get<ShoppingListService>(ShoppingListService);
    shoppingListRepository = module.get(ShoppingListRepository);
    shoppingListItemRepository = module.get(ShoppingListItemRepository);
  });

  // SCHRITT 2: Basis-Test - Prüfen ob der Service erstellt werden kann
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // SCHRITT 3: Tests für die CREATE-Methode
  describe('create', () => {
    it('should create a shopping list successfully', async () => {
      // ARRANGE: Test-Daten vorbereiten
      const createDto: CreateShoppingListDto = {
        title: 'Test Shopping List',
      };
      const userId = 'user-1';

      // Mock Repository so konfigurieren, dass es unsere Test-Daten zurückgibt
      shoppingListRepository.create.mockResolvedValue(mockShoppingList);

      // ACT: Die Methode ausführen, die wir testen wollen
      const result = await service.create(createDto, userId);

      // ASSERT: Prüfen ob alles richtig funktioniert hat
      expect(shoppingListRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
      });
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

  // SCHRITT 4: Tests für die FIND ALL-Methode
  describe('findAll', () => {
    it('should return all shopping lists', async () => {
      // ARRANGE
      shoppingListRepository.findAll.mockResolvedValue(mockShoppingListArray);

      // ACT
      const result = await service.findAll();

      // ASSERT
      expect(shoppingListRepository.findAll).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBe('Test Shopping List');
    });
  });

  // SCHRITT 5: Tests für die FIND BY ID-Methode
  describe('findById', () => {
    it('should return shopping list by id when user is owner', async () => {
      // ARRANGE
      const listId = 'list-1';
      const userId = 'user-1';
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      // ACT
      const result = await service.findById(listId, userId);

      // ASSERT
      expect(shoppingListRepository.findById).toHaveBeenCalledWith(listId);
      expect(result.id).toBe(mockShoppingList.id);
    });

    it('should throw NotFoundException when shopping list does not exist', async () => {
      // ARRANGE
      const listId = 'non-existent-id';
      const userId = 'user-1';
      shoppingListRepository.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findById(listId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(listId, userId)).rejects.toThrow(
        'Shopping list dosent exist',
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      // ARRANGE
      const listId = 'list-1';
      const differentUserId = 'user-2'; // Anderer Benutzer als der Eigentümer
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      // ACT & ASSERT
      await expect(service.findById(listId, differentUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // SCHRITT 6: Tests für die UPDATE-Methode
  describe('update', () => {
    it('should update shopping list successfully when user is owner', async () => {
      // ARRANGE
      const listId = 'list-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListDto = {
        title: 'Updated Title',
      };
      const updatedList = { ...mockShoppingList, title: 'Updated Title' };

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      shoppingListRepository.update.mockResolvedValue(updatedList);

      // ACT
      const result = await service.update(listId, updateDto, userId);

      // ASSERT
      expect(shoppingListRepository.findById).toHaveBeenCalledWith(listId);
      expect(shoppingListRepository.update).toHaveBeenCalledWith(
        listId,
        updateDto,
      );
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException when shopping list does not exist', async () => {
      // ARRANGE
      const listId = 'non-existent-id';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListDto = { title: 'New Title' };

      shoppingListRepository.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.update(listId, updateDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      // ARRANGE
      const listId = 'list-1';
      const differentUserId = 'user-2';
      const updateDto: UpdateShoppingListDto = { title: 'New Title' };

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      // ACT & ASSERT
      await expect(
        service.update(listId, updateDto, differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // SCHRITT 7: Tests für die DELETE-Methode
  describe('remove', () => {
    it('should delete shopping list successfully when user is owner', async () => {
      // ARRANGE
      const listId = 'list-1';
      const userId = 'user-1';

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      // ACT
      await service.remove(listId, userId);

      // ASSERT
      expect(shoppingListRepository.findById).toHaveBeenCalledWith(listId);
      expect(shoppingListRepository.delete).toHaveBeenCalledWith(listId);
    });

    it('should throw NotFoundException when shopping list does not exist', async () => {
      // ARRANGE
      const listId = 'non-existent-id';
      const userId = 'user-1';

      shoppingListRepository.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.remove(listId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      // ARRANGE
      const listId = 'list-1';
      const differentUserId = 'user-2';

      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);

      // ACT & ASSERT
      await expect(service.remove(listId, differentUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // SCHRITT 8: Test für die private Methode (indirekt über andere Tests)
  describe('transformToResponseDto', () => {
    it('should transform data correctly (tested through create method)', async () => {
      // Dieser Test wird implizit durch die anderen Tests abgedeckt
      // da transformToResponseDto in create, findById und update verwendet wird
      const createDto: CreateShoppingListDto = {
        title: 'Test List',
      };
      const userId = 'user-1';

      shoppingListRepository.create.mockResolvedValue(mockShoppingList);

      const result = await service.create(createDto, userId);

      // Prüfen ob die Transformation korrekt ist
      expect(result).toEqual({
        id: mockShoppingList.id,
        title: mockShoppingList.title,
        createdAt: mockShoppingList.createdAt,
        updatedAt: mockShoppingList.updatedAt,
      });
    });
  });
});
