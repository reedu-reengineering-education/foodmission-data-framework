import { Test, TestingModule } from '@nestjs/testing';
import {
  ShoppingListRepository,
  CreateShoppingListDto,
  UpdateShoppingListDto,
} from './shoppingList.repository';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

// WICHTIG: Korrekte Mock-Typen für Prisma
interface MockPrismaService {
  shoppingList: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
}

describe('ShoppingListRepository', () => {
  let repository: ShoppingListRepository;
  let prismaService: MockPrismaService;

  // Mock-Daten für unsere Tests (mit korrekten Typen)
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

  // SCHRITT 1: Korrektes Test-Setup für Repository mit Prisma
  beforeEach(async () => {
    // Mock für PrismaService mit Jest.Mock-Funktionen erstellen
    const mockPrismaService: MockPrismaService = {
      shoppingList: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ShoppingListRepository>(ShoppingListRepository);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  // Nach jedem Test die Mocks zurücksetzen
  afterEach(() => {
    jest.clearAllMocks();
  });

  // SCHRITT 2: Basis-Test
  it('should be defined', () => {
    expect(repository).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  // SCHRITT 3: Tests für FIND ALL
  describe('findAll', () => {
    it('should return all shopping lists', async () => {
      // ARRANGE: Mock so konfigurieren, dass es unsere Test-Daten zurückgibt
      prismaService.shoppingList.findMany.mockResolvedValue(
        mockShoppingListArray,
      );

      // ACT: Repository-Methode aufrufen
      const result = await repository.findAll();

      // ASSERT: Prüfen ob Prisma richtig aufgerufen wurde und Ergebnis stimmt
      expect(prismaService.shoppingList.findMany).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.findMany).toHaveBeenCalledWith();
      expect(result).toEqual(mockShoppingListArray);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no shopping lists exist', async () => {
      // ARRANGE
      prismaService.shoppingList.findMany.mockResolvedValue([]);

      // ACT
      const result = await repository.findAll();

      // ASSERT
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle database errors in findAll', async () => {
      // ARRANGE: Simuliere einen Datenbank-Fehler
      const dbError = new Error('Database connection failed');
      prismaService.shoppingList.findMany.mockRejectedValue(dbError);

      // ACT & ASSERT
      await expect(repository.findAll()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  // SCHRITT 4: Tests für FIND BY ID
  describe('findById', () => {
    it('should return shopping list with items by id', async () => {
      // ARRANGE
      const listId = 'list-1';
      prismaService.shoppingList.findUnique.mockResolvedValue(mockShoppingList);

      // ACT
      await repository.findById(listId);

      // ASSERT: Prüfen ob findUnique mit richtigen Parametern aufgerufen wurde
      expect(prismaService.shoppingList.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.findUnique).toHaveBeenCalledWith({
        where: { id: listId },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    });

    it('should return null when shopping list does not exist', async () => {
      // ARRANGE
      const listId = 'non-existent-id';
      prismaService.shoppingList.findUnique.mockResolvedValue(null);

      // ACT
      const result = await repository.findById(listId);

      // ASSERT
      expect(result).toBeNull();
      expect(prismaService.shoppingList.findUnique).toHaveBeenCalledWith({
        where: { id: listId },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    });

    it('should throw error when database operation fails', async () => {
      // ARRANGE: Simuliere einen Datenbank-Fehler
      const listId = 'list-1';
      const dbError = new Error('Database connection failed');
      prismaService.shoppingList.findUnique.mockRejectedValue(dbError);

      // ACT & ASSERT: Prüfen ob die richtige Error-Message geworfen wird
      await expect(repository.findById(listId)).rejects.toThrow(
        'Cloudnt find shopping list.',
      );
    });
  });

  // SCHRITT 5: Tests für CREATE
  describe('create', () => {
    it('should create a shopping list successfully', async () => {
      // ARRANGE
      const createData: CreateShoppingListDto = {
        title: 'New Shopping List',
        userId: 'user-1',
      };
      prismaService.shoppingList.create.mockResolvedValue(mockShoppingList);

      // ACT
      const result = await repository.create(createData);

      // ASSERT
      expect(prismaService.shoppingList.create).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.create).toHaveBeenCalledWith({
        data: createData,
      });
      expect(result).toEqual(mockShoppingList);
    });

    it('should throw error when creation fails', async () => {
      // ARRANGE: Simuliere einen generischen Datenbank-Fehler
      const createData: CreateShoppingListDto = {
        title: 'New Shopping List',
        userId: 'user-1',
      };
      const dbError = new Error('Database error');
      prismaService.shoppingList.create.mockRejectedValue(dbError);

      // ACT & ASSERT
      await expect(repository.create(createData)).rejects.toThrow(
        'Failed to create shopping list.',
      );
    });

    it('should handle Prisma known request errors', async () => {
      // ARRANGE: Simuliere einen spezifischen Prisma-Fehler
      const createData: CreateShoppingListDto = {
        title: 'Duplicate Title',
        userId: 'user-1',
      };

      // Erstelle einen Prisma-spezifischen Fehler
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      prismaService.shoppingList.create.mockRejectedValue(prismaError);

      // ACT & ASSERT
      await expect(repository.create(createData)).rejects.toThrow(
        'Failed to create shopping list.',
      );
    });
  });

  // SCHRITT 6: Tests für UPDATE
  describe('update', () => {
    it('should update shopping list successfully', async () => {
      // ARRANGE
      const listId = 'list-1';
      const updateData: UpdateShoppingListDto = {
        title: 'Updated Title',
      };
      const updatedList = { ...mockShoppingList, title: 'Updated Title' };

      prismaService.shoppingList.update.mockResolvedValue(updatedList);

      // ACT
      const result = await repository.update(listId, updateData);

      // ASSERT: Prüfen ob update mit richtigen Parametern aufgerufen wurde
      expect(prismaService.shoppingList.update).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: updateData,
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
      expect(result).toEqual(updatedList);
      expect(result.title).toBe('Updated Title');
    });

    it('should throw error when update fails', async () => {
      // ARRANGE
      const listId = 'list-1';
      const updateData: UpdateShoppingListDto = {
        title: 'Updated Title',
      };
      const dbError = new Error('Database connection lost');
      prismaService.shoppingList.update.mockRejectedValue(dbError);

      // ACT & ASSERT
      await expect(repository.update(listId, updateData)).rejects.toThrow(
        'Failed to update shopping list.',
      );
    });
  });

  // SCHRITT 7: Tests für DELETE
  describe('delete', () => {
    it('should delete shopping list successfully', async () => {
      // ARRANGE
      const listId = 'list-1';
      // delete() in Prisma gibt normalerweise das gelöschte Objekt zurück
      prismaService.shoppingList.delete.mockResolvedValue(mockShoppingList);

      // ACT
      await repository.delete(listId);

      // ASSERT
      expect(prismaService.shoppingList.delete).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.delete).toHaveBeenCalledWith({
        where: { id: listId },
      });
    });

    it('should throw specific error when shopping list not found (P2025)', async () => {
      // ARRANGE: Simuliere "Record not found" Fehler
      const listId = 'non-existent-id';
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        {
          code: 'P2025', // Prisma Error Code für "Record not found"
          clientVersion: '4.0.0',
        },
      );

      prismaService.shoppingList.delete.mockRejectedValue(prismaError);

      // ACT & ASSERT
      await expect(repository.delete(listId)).rejects.toThrow(
        'Shopping list not found',
      );
    });

    it('should throw generic error for other database errors', async () => {
      // ARRANGE
      const listId = 'list-1';
      const dbError = new Error('Database connection failed');
      prismaService.shoppingList.delete.mockRejectedValue(dbError);

      // ACT & ASSERT
      await expect(repository.delete(listId)).rejects.toThrow(
        'Failed to delete shopping list',
      );
    });
  });

  // SCHRITT 8: Tests für COUNT
  describe('count', () => {
    it('should return count of all shopping lists', async () => {
      // ARRANGE
      const expectedCount = 5;
      prismaService.shoppingList.count.mockResolvedValue(expectedCount);

      // ACT
      const result = await repository.count();

      // ASSERT
      expect(prismaService.shoppingList.count).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.count).toHaveBeenCalledWith({
        where: undefined,
      });
      expect(result).toBe(expectedCount);
    });

    it('should return count with where condition', async () => {
      // ARRANGE
      const whereCondition = { userId: 'user-1' };
      const expectedCount = 3;
      prismaService.shoppingList.count.mockResolvedValue(expectedCount);

      // ACT
      const result = await repository.count(whereCondition);

      // ASSERT
      expect(prismaService.shoppingList.count).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.count).toHaveBeenCalledWith({
        where: whereCondition,
      });
      expect(result).toBe(expectedCount);
    });

    it('should throw error when count fails', async () => {
      // ARRANGE
      const dbError = new Error('Database error');
      prismaService.shoppingList.count.mockRejectedValue(dbError);

      // ACT & ASSERT
      await expect(repository.count()).rejects.toThrow(
        'Failed to count shoppings lists',
      );
    });
  });

  // SCHRITT 9: Integration-Test-ähnliche Szenarien
  describe('complex scenarios', () => {
    it('should handle multiple operations in sequence', async () => {
      // ARRANGE: Simuliere eine Sequenz von Operationen
      const createData: CreateShoppingListDto = {
        title: 'Test List',
        userId: 'user-1',
      };
      const updateData: UpdateShoppingListDto = {
        title: 'Updated List',
      };

      // Setup Mocks für die Sequenz
      prismaService.shoppingList.create.mockResolvedValue(mockShoppingList);
      prismaService.shoppingList.findUnique.mockResolvedValue(mockShoppingList);
      prismaService.shoppingList.update.mockResolvedValue({
        ...mockShoppingList,
        title: 'Updated List',
      });

      // ACT: Führe mehrere Operationen durch
      const created = await repository.create(createData);
      const found = await repository.findById(created.id);
      const updated = await repository.update(created.id, updateData);

      // ASSERT: Prüfe die gesamte Sequenz
      expect(created.title).toBe('Test Shopping List');
      expect(found?.id).toBe(created.id);
      expect(updated.title).toBe('Updated List');

      // Prüfe dass alle Mocks aufgerufen wurden
      expect(prismaService.shoppingList.create).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaService.shoppingList.update).toHaveBeenCalledTimes(1);
    });
  });

  // SCHRITT 10: Edge Cases
  describe('edge cases', () => {
    it('should handle empty strings in create data', async () => {
      // ARRANGE
      const createData: CreateShoppingListDto = {
        title: '', // Leerer Titel
        userId: 'user-1',
      };
      const listWithEmptyTitle = { ...mockShoppingList, title: '' };
      prismaService.shoppingList.create.mockResolvedValue(listWithEmptyTitle);

      // ACT
      const result = await repository.create(createData);

      // ASSERT
      expect(result.title).toBe('');
      expect(prismaService.shoppingList.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should handle very long titles', async () => {
      // ARRANGE
      const longTitle = 'A'.repeat(1000); // Sehr langer Titel
      const createData: CreateShoppingListDto = {
        title: longTitle,
        userId: 'user-1',
      };
      const listWithLongTitle = { ...mockShoppingList, title: longTitle };
      prismaService.shoppingList.create.mockResolvedValue(listWithLongTitle);

      // ACT
      const result = await repository.create(createData);

      // ASSERT
      expect(result.title).toBe(longTitle);
      expect(result.title.length).toBe(1000);
    });

    it('should handle special characters in titles', async () => {
      // ARRANGE
      const specialTitle = 'Liste mit Ümlä!@#$%^&*()';
      const createData: CreateShoppingListDto = {
        title: specialTitle,
        userId: 'user-1',
      };
      const listWithSpecialTitle = { ...mockShoppingList, title: specialTitle };
      prismaService.shoppingList.create.mockResolvedValue(listWithSpecialTitle);

      // ACT
      const result = await repository.create(createData);

      // ASSERT
      expect(result.title).toBe(specialTitle);
    });
  });
});
