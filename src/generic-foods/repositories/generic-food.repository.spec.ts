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
    $queryRaw: jest.fn(),
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

  describe('search', () => {
    const sqlOf = () =>
      (prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    const valuesOf = () => prisma.$queryRaw.mock.calls[0].slice(1);

    it('compares the normalized term against search_normalize() columns', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repository.findSearchCandidates('Olio d’oliva', 'en');

      expect(sqlOf()).toContain('search_normalize(g."foodName")');
      expect(valuesOf()).toContain('olio d oliva');
      expect(valuesOf()).toContain('%olio d oliva%');
    });

    it('treats LIKE wildcards as punctuation, not wildcards', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repository.findSearchCandidates('100%_x', 'en');

      expect(valuesOf()).toContain('%100 x%');
      expect(valuesOf().join(' ')).not.toMatch(/100%|_x/);
    });

    it('does not query when the term is only punctuation', async () => {
      await expect(
        repository.findSearchCandidates(' -‘’… ', 'en'),
      ).resolves.toEqual([]);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('searches only English fields for en', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repository.findSearchCandidates('pasta', 'en');

      expect(sqlOf()).not.toContain('entity_translations');
      expect(sqlOf()).toContain('"foodGroup"');
      expect(sqlOf()).not.toContain('ORDER BY');
    });

    it('also searches translated names for other locales', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await repository.findSearchCandidates('appel', 'nl');

      expect(sqlOf()).toContain('entity_translations');
      expect(sqlOf()).toContain('ARRAY_AGG(t.value)');
      expect(sqlOf()).toContain('search_normalize(t.value)');
      expect(valuesOf()).toContain('nl');
    });

    it('skips queries for empty id lists', async () => {
      await expect(repository.findByIds([])).resolves.toEqual([]);
      await expect(
        repository.filterIdsByFoodGroup([], 'Fruits'),
      ).resolves.toEqual([]);
      expect(prisma.genericFood.findMany).not.toHaveBeenCalled();
    });

    it('filters ids by English or translated food group', async () => {
      prisma.genericFood.findMany.mockResolvedValue([{ id: 'b' }]);

      const ids = await repository.filterIdsByFoodGroup(['a', 'b'], 'Fruit', [
        'b',
      ]);

      expect(ids).toEqual(['b']);
      expect(prisma.genericFood.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { in: ['a', 'b'] } },
            {
              OR: [
                { foodGroup: { contains: 'Fruit', mode: 'insensitive' } },
                { id: { in: ['b'] } },
              ],
            },
          ],
        },
        select: { id: true },
      });
    });
  });
});
