import { Test, TestingModule } from '@nestjs/testing';
import { Foodex2Repository } from './foodex2.repository';
import { PrismaService } from '../../database/prisma.service';

/** Flattens a Prisma tagged-template call into inspectable SQL and values. */
function sqlOf(call: any[]): { text: string; values: unknown[] } {
  const [strings, ...params] = call;
  const fragments: string[] = [...strings];
  const values: unknown[] = [];

  params.forEach((param) => {
    if (param && typeof param === 'object' && 'strings' in param) {
      // A nested Prisma.sql fragment (the rank/filter expressions).
      fragments.push(...param.strings);
      values.push(...(param.values ?? []));
    } else {
      values.push(param);
    }
  });

  return { text: fragments.join(' '), values };
}

describe('Foodex2Repository', () => {
  let repository: Foodex2Repository;
  let prisma: any;

  const mockPrismaService: any = {
    $queryRaw: jest.fn(),
    genericFood: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Foodex2Repository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get(Foodex2Repository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    beforeEach(() => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0n }]);
    });

    it('only joins concepts that have a canonical NEVO mapping', async () => {
      await repository.search({ search: 'pasta', skip: 0, take: 20 });

      const { text } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(text).toContain('"foodex2_nevo_mappings"');
      expect(text).toContain('"isCanonical" = TRUE');
    });

    it('ranks exact, then prefix, then substring, then synonym matches', async () => {
      await repository.search({ search: 'Pasta', skip: 0, take: 20 });

      const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(text).toContain('ORDER BY "matchRank" ASC');
      // Search is case-insensitive: the term is lowercased for comparison.
      expect(values).toContain('pasta');
      expect(values).toContain('pasta%');
      expect(values).toContain('%pasta%');
    });

    it('matches only the head of a variant name, not its ingredients', async () => {
      await repository.search({ search: 'Kartoffeln', skip: 0, take: 20 });

      const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      // "Omelett mit Kartoffeln" must not make *Egg based dishes* a potato.
      expect(text).toContain('regexp_replace');
      expect(text).toContain('split_part(LOWER(');
      expect(values).toContain(
        String.raw`\s+(mit|met|with|w|wo|without|und|and|en|in|im|auf|op|ohne|zonder|from|van)\s.*$`,
      );
    });

    it('needs a head-initial match on a composite concept, not a mention', async () => {
      await repository.search({ search: 'Paprika', skip: 0, take: 20 });

      const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      // "Mit Frischkäse gefüllte Paprika" must not make *Finger food* a
      // pepper, while "Frühlingsrolle" must still find it.
      expect(text).toContain('WITH RECURSIVE');
      expect(text).toContain('SELECT "code" FROM "composite_terms"');
      expect(values).toContain('A0BAG');
      expect(values).toContain('paprika%');
      expect(values).toContain('%paprika%');
      // Word order differs per language, so the head rule only holds in the
      // locale that was asked for.
      expect(text).toContain('gtr."locale" = ');
    });

    it('matches a plural by its stem', async () => {
      await repository.search({ search: 'Frühlingsrollen', skip: 0, take: 20 });

      const { values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(values).toContain('%frühlingsrolle%');
      // The exact-name tier still compares the term as it was typed.
      expect(values).toContain('frühlingsrollen');
    });

    it('leaves a short word alone when stripping a plural', async () => {
      await repository.search({ search: 'Wein', skip: 0, take: 20 });

      const { values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(values).toContain('%wein%');
      expect(values).not.toContain('%wei%');
    });

    it('matches a concept name in any locale it is translated into', async () => {
      await repository.search({ search: 'Kartoffeln', skip: 0, take: 20 });

      const { text } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(text).toContain(`ltr."entityType" = 'Foodex2Term'`);
    });

    it('escapes LIKE wildcards so they are matched literally', async () => {
      await repository.search({ search: '50%', skip: 0, take: 20 });

      const { values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(values).toContain('%50\\%%');
    });

    it('browses the whole vocabulary when no search term is given', async () => {
      await repository.search({ skip: 0, take: 20 });

      const { text } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(text).toContain('TRUE');
      expect(text).not.toContain('LIKE');
    });

    it('filters to the core list only when asked', async () => {
      await repository.search({
        search: 'pasta',
        coreOnly: true,
        skip: 0,
        take: 20,
      });

      expect(sqlOf(prisma.$queryRaw.mock.calls[0]).text).toContain(
        '"isCore" = TRUE',
      );
    });

    it('returns the total as a number', async () => {
      prisma.$queryRaw.mockReset();
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 42n }]);

      await expect(repository.search({ skip: 0, take: 20 })).resolves.toEqual({
        rows: [],
        total: 42,
      });
    });
  });

  describe('findByCode', () => {
    it('normalises the code before looking it up', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await repository.findByCode(' a007l ');

      expect(sqlOf(prisma.$queryRaw.mock.calls[0]).values).toContain('A007L');
    });

    it('returns null when the code has no canonical mapping', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);
      await expect(repository.findByCode('A007G')).resolves.toBeNull();
    });
  });

  describe('findGenericFoodsByNevoCodes', () => {
    it('reads nutrients from the existing GenericFood records', async () => {
      prisma.genericFood.findMany.mockResolvedValue([
        { nevoCode: 4, foodName: 'Pasta white raw' },
      ]);

      const result = await repository.findGenericFoodsByNevoCodes([4]);

      expect(prisma.genericFood.findMany).toHaveBeenCalledWith({
        where: { nevoCode: { in: [4] } },
      });
      expect(result.get(4)).toMatchObject({ foodName: 'Pasta white raw' });
    });

    it('skips the query for an empty code list', async () => {
      await expect(repository.findGenericFoodsByNevoCodes([])).resolves.toEqual(
        new Map(),
      );
      expect(prisma.genericFood.findMany).not.toHaveBeenCalled();
    });
  });

  describe('localized search', () => {
    beforeEach(() => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0n }]);
    });

    it('joins FoodEx2 name translations for the locale', async () => {
      await repository.search({
        search: 'Nudeln',
        locale: 'de',
        skip: 0,
        take: 20,
      });

      const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(text).toContain('"entity_translations"');
      expect(text).toContain(`'Foodex2Term'`);
      expect(values).toContain('de');
    });

    it('also matches the translated names of the concept’s NEVO variants', async () => {
      await repository.search({
        search: 'Nudeln',
        locale: 'de',
        skip: 0,
        take: 20,
      });

      const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      // This is what makes "Nudeln" resolve while the concept name is still
      // English: its NEVO variants are translated.
      expect(text).toContain(`'GenericFood'`);
      expect(text).toContain('"generic_foods"');
      expect(values).toContain('%nudeln%');
    });

    it('falls back to the English MTX name when no translation exists', async () => {
      await repository.search({
        search: 'pasta',
        locale: 'de',
        skip: 0,
        take: 20,
      });

      expect(sqlOf(prisma.$queryRaw.mock.calls[0]).text).toContain('COALESCE');
    });

    it('defaults to the English locale', async () => {
      await repository.search({ search: 'pasta', skip: 0, take: 20 });

      expect(sqlOf(prisma.$queryRaw.mock.calls[0]).values).toContain('en');
    });

    it('ranks a canonical-name match above an incidental variant match', async () => {
      await repository.search({
        search: 'Nudeln',
        locale: 'de',
        skip: 0,
        take: 20,
      });

      const { text } = sqlOf(prisma.$queryRaw.mock.calls[0]);
      // Tiers 7/8 are canonical-name matches; 9 is "some variant mentions it",
      // which is how "Klare Suppe mit Nudeln" stops outranking real pasta.
      expect(text).toContain('THEN 7');
      expect(text).toContain('THEN 8');
      expect(text).toContain('ELSE 9');
      expect(text).toContain('cg."foodName"');
    });
  });
});
