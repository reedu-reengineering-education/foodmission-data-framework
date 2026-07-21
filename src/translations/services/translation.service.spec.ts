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
