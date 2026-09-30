import { PrismaService } from '../../database/prisma.service';
import { TranslationService } from '../../translations/services/translation.service';
import { BadgesService } from './badges.service';

const badge = (code: string, sortOrder: number) => ({
  id: `badge-${code}`,
  code,
  name: code,
  description: null,
  imageUrl: null,
  sortOrder,
  ruleCode: code,
});

describe('BadgesService', () => {
  let prisma: {
    badge: { findMany: jest.Mock; findUnique: jest.Mock };
    userEarnedBadge: { findMany: jest.Mock };
    badgeProgress: { findMany: jest.Mock };
    entityTranslation: { findMany: jest.Mock };
  };
  let service: BadgesService;

  beforeEach(() => {
    prisma = {
      badge: { findMany: jest.fn(), findUnique: jest.fn() },
      userEarnedBadge: { findMany: jest.fn().mockResolvedValue([]) },
      badgeProgress: { findMany: jest.fn().mockResolvedValue([]) },
      entityTranslation: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const db = prisma as unknown as PrismaService;
    service = new BadgesService(db, new TranslationService(db));
  });

  it('hides retired badges from the catalog', async () => {
    prisma.badge.findMany.mockResolvedValue([]);

    await service.listCatalog();

    expect(prisma.badge.findMany.mock.calls[0][0].where).toEqual({
      available: true,
    });
  });

  it('keeps a retired badge in the user list when the user earned it', async () => {
    const earnedAt = new Date('2026-09-01T00:00:00.000Z');
    // The query returns the retired CHEF only because the user earned it.
    prisma.badge.findMany.mockResolvedValue([
      badge('CHEF', 1),
      badge('BRAINY', 2),
    ]);
    prisma.userEarnedBadge.findMany.mockResolvedValue([
      { badgeId: 'badge-CHEF', earnedAt },
    ]);

    const result = await service.listForUser('u1');

    expect(prisma.badge.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ available: true }, { earnedByUsers: { some: { userId: 'u1' } } }],
    });
    expect(result.earnedCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.badges[0]).toMatchObject({
      code: 'CHEF',
      earned: true,
      earnedAt,
      progress: 100,
    });
  });

  it('overlays translated name and description for lang', async () => {
    prisma.badge.findMany.mockResolvedValue([
      { ...badge('CHEF', 1), description: 'View 5 different recipes.' },
      badge('BRAINY', 2),
    ]);
    prisma.entityTranslation.findMany.mockResolvedValue([
      { entityId: 'badge-CHEF', field: 'name', value: 'Küchenchef' },
      {
        entityId: 'badge-CHEF',
        field: 'description',
        value: 'Sieh dir 5 verschiedene Rezepte an.',
      },
    ]);

    const result = await service.listCatalog('de');

    expect(prisma.entityTranslation.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ entityType: 'Badge', locale: 'de' }),
    );
    expect(result.badges[0]).toMatchObject({
      code: 'CHEF',
      name: 'Küchenchef',
      description: 'Sieh dir 5 verschiedene Rezepte an.',
    });
    // No translation row: the English catalog value stays.
    expect(result.badges[1]).toMatchObject({ code: 'BRAINY', name: 'BRAINY' });
  });

  it('skips the translation lookup for English', async () => {
    prisma.badge.findMany.mockResolvedValue([badge('CHEF', 1)]);

    await service.listCatalog();

    expect(prisma.entityTranslation.findMany).not.toHaveBeenCalled();
  });
});
