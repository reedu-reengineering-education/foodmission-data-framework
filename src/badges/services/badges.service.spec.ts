import { PrismaService } from '../../database/prisma.service';
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
  };
  let service: BadgesService;

  beforeEach(() => {
    prisma = {
      badge: { findMany: jest.fn(), findUnique: jest.fn() },
      userEarnedBadge: { findMany: jest.fn().mockResolvedValue([]) },
      badgeProgress: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new BadgesService(prisma as unknown as PrismaService);
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
});
