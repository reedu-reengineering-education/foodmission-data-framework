import { Test, TestingModule } from '@nestjs/testing';
import { GenericFoodRepository } from './generic-food.repository';
import { PrismaService } from '../../database/prisma.service';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { TEST_FOOD_CATEGORY } from '../../../test/fixtures/food.fixtures';

describe('GenericFoodRepository', () => {
  let repository: GenericFoodRepository;
  let prisma: any;

  const mockItem: any = { ...TEST_FOOD_CATEGORY, id: 'generic-123' };

  const mockPrismaService: any = {
    genericFood: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericFoodRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get(GenericFoodRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a generic food', async () => {
    const dto = { foodName: 'Tomato' } as any;
    prisma.genericFood.create.mockResolvedValue(mockItem);

    await repository.create(dto);

    expect(prisma.genericFood.create).toHaveBeenCalledWith({ data: dto });
  });

  it('findAll uses genericFood filters/pagination', async () => {
    const query: GenericFoodQueryDto = { search: 'tomato', page: 2, limit: 10 };
    prisma.genericFood.findMany.mockResolvedValue([mockItem]);
    prisma.genericFood.count.mockResolvedValue(11);

    const result = await repository.findAll(query);

    expect(prisma.genericFood.findMany).toHaveBeenCalled();
    expect(prisma.genericFood.count).toHaveBeenCalled();
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it('findById uses genericFood model', async () => {
    prisma.genericFood.findUnique.mockResolvedValue(mockItem);
    await repository.findById('generic-123');
    expect(prisma.genericFood.findUnique).toHaveBeenCalledWith({
      where: { id: 'generic-123' },
    });
  });
});
