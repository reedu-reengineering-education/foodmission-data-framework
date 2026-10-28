import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { PrismaService } from '../../database/prisma.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let prisma: {
    entityTranslation: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      entityTranslation: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TranslationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveLocale', () => {
    it('defaults to en', () => {
      expect(service.resolveLocale()).toBe('en');
    });

    it('accepts supported locales', () => {
      expect(service.resolveLocale('nl')).toBe('nl');
    });

    it('falls back for unknown locales', () => {
      expect(service.resolveLocale('xx')).toBe('en');
    });
  });

  describe('resolve', () => {
    it('returns English fallbacks without querying DB', async () => {
      const result = await service.resolve(
        'GenericFood',
        'id-1',
        'en',
        ['foodName', 'foodGroup'],
        { foodName: 'Potato raw', foodGroup: 'Potatoes and tubers' },
      );

      expect(result).toEqual({
        foodName: 'Potato raw',
        foodGroup: 'Potatoes and tubers',
      });
      expect(prisma.entityTranslation.findMany).not.toHaveBeenCalled();
    });

    it('overlays non-empty translations', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { field: 'foodName', value: 'Aardappelen rauw' },
        { field: 'foodGroup', value: 'Aardappelen en knolgewassen' },
      ]);

      const result = await service.resolve(
        'GenericFood',
        'id-1',
        'nl',
        ['foodName', 'foodGroup', 'remark'],
        {
          foodName: 'Potato raw',
          foodGroup: 'Potatoes and tubers',
          remark: null,
        },
      );

      expect(result.foodName).toBe('Aardappelen rauw');
      expect(result.foodGroup).toBe('Aardappelen en knolgewassen');
      expect(result.remark).toBeNull();
    });

    it('rejects invalid fields', async () => {
      await expect(
        service.resolve('GenericFood', 'id-1', 'nl', ['title'], {
          title: 'x',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveMany', () => {
    it('batches overlays for multiple entities', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        {
          entityId: 'a',
          field: 'foodName',
          value: 'Appel',
        },
      ]);

      const result = await service.resolveMany(
        'GenericFood',
        ['a', 'b'],
        'nl',
        ['foodName'],
        {
          a: { foodName: 'Apple' },
          b: { foodName: 'Banana' },
        },
      );

      expect(result.a.foodName).toBe('Appel');
      expect(result.b.foodName).toBe('Banana');
    });
  });

  describe('deleteForEntity', () => {
    it('deletes all rows for an entity', async () => {
      prisma.entityTranslation.deleteMany.mockResolvedValue({ count: 2 });
      await service.deleteForEntity('GenericFood', 'id-1');
      expect(prisma.entityTranslation.deleteMany).toHaveBeenCalledWith({
        where: { entityType: 'GenericFood', entityId: 'id-1' },
      });
    });
  });

  describe('findEntityIdsByValue', () => {
    it('uses contains match by default', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { entityId: 'id-1' },
      ]);

      await service.findEntityIdsByValue(
        'GenericFood',
        'nl',
        ['foodName'],
        'appel',
      );

      expect(prisma.entityTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            value: { contains: 'appel', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('matches words and their inflected forms', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { entityId: 'raw', value: 'Pomodori crudi' },
        { entityId: 'juice', value: 'Succo di pomodoro/verdura' },
        { entityId: 'puree', value: 'Concentrato di pomodoro' },
        { entityId: 'puree', value: 'Passata di pomodoro' },
        { entityId: 'parsnip', value: 'Pomodorinoso inventato' },
      ]);

      const ids = await service.findEntityIdsByValue(
        'GenericFood',
        'it',
        ['foodName'],
        'pomodoro',
        'word',
      );

      expect(ids).toEqual(['raw', 'juice', 'puree']);
      expect(prisma.entityTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            value: { contains: 'pomodor', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('matches words after an apostrophe', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { entityId: 'olive-oil', value: "Olio d'oliva" },
      ]);

      await expect(
        service.findEntityIdsByValue(
          'GenericFood',
          'it',
          ['foodName'],
          'oliva',
          'word',
        ),
      ).resolves.toEqual(['olive-oil']);
    });

    it('matches a term with punctuation by its words', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { entityId: 'olive-oil', value: "Olio d'oliva" },
        { entityId: 'olives', value: 'Olive verdi' },
      ]);

      await expect(
        service.findEntityIdsByValue(
          'GenericFood',
          'it',
          ['foodName'],
          "d'oliva",
          'word',
        ),
      ).resolves.toEqual(['olive-oil']);
      expect(prisma.entityTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            value: { contains: 'oliv', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('also matches compound heads in German', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { entityId: 'whole-milk', value: 'Vollmilch' },
        { entityId: 'shake', value: 'Milchshake' },
        { entityId: 'cheese', value: 'Käse aus Rohmilch' },
      ]);

      const ids = await service.findEntityIdsByValue(
        'GenericFood',
        'de',
        ['foodName'],
        'milch',
        'word',
      );

      expect(ids).toEqual(['whole-milk', 'shake']);
      expect(prisma.entityTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            value: { contains: 'milch', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('supports exact match for filters', async () => {
      prisma.entityTranslation.findMany.mockResolvedValue([
        { entityId: 'id-1' },
      ]);

      await service.findEntityIdsByValue(
        'GenericFood',
        'nl',
        ['foodGroup'],
        'Groenten',
        'equals',
      );

      expect(prisma.entityTranslation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            value: { equals: 'Groenten', mode: 'insensitive' },
          }),
        }),
      );
    });
  });
});
