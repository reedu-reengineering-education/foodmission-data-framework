import { Test, TestingModule } from '@nestjs/testing';
import {
  ShoppingListRepository
} from './shoppingList.repository';
import { PrismaService } from '../../database/prisma.service';

describe('ShoppingListRepository', () => {
  let repository: ShoppingListRepository;

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test shopping list',
  };

  let mockPrismaService: any;

  beforeAll(() => {
    mockPrismaService = {
      fooshoppingListd: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
  });

  beforeEach(async () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

 
  });

