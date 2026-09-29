import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FoodyItem, FoodyItemType, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/database/prisma.service';
import { EventType } from '../../src/events/event-types';
import { UserEventService } from '../../src/events/services/user-event.service';
import { FoodyRepository } from '../../src/foody/repositories/foody.repository';
import { FoodyService } from '../../src/foody/services/foody.service';
import { BadgeService } from '../../src/gamification/services/badge.service';
import { GamificationProfileService } from '../../src/gamification/services/gamification-profile.service';
import { GamificationWalletService } from '../../src/gamification/services/gamification-wallet.service';
import { RulesService } from '../../src/rules/rules.service';
import { createTestPrismaClient } from './helpers/prisma-e2e-helpers';

/**
 * Exercises the parts mocked unit tests cannot reach: the loadout row lock, the
 * guarded balance increment, and the rollback of a purchase whose debit fails.
 */
describe('Foody purchases and loadout (e2e)', () => {
  let prisma: PrismaClient;
  let service: FoodyService;
  let userId: string;

  let glassesA: FoodyItem;
  let glassesB: FoodyItem;
  let ears: FoodyItem;
  let freeItem: FoodyItem;

  beforeAll(async () => {
    prisma = createTestPrismaClient();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FoodyService,
        FoodyRepository,
        GamificationWalletService,
        GamificationProfileService,
        BadgeService,
        UserEventService,
        { provide: RulesService, useValue: { evaluateUserEvent: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(FoodyService);

    const user = await prisma.user.create({
      data: {
        keycloakId: 'e2e-foody-user',
        email: 'e2e-foody-user@test.com',
        firstName: 'Foody',
        lastName: 'Tester',
      },
    });
    userId = user.id;

    // Slots well above the seeded catalog, so (type, slot) cannot collide.
    [glassesA, glassesB, ears, freeItem] = await Promise.all([
      prisma.foodyItem.create({
        data: {
          code: 'E2E_GLASSES_A',
          type: FoodyItemType.GLASSES,
          slot: 901,
          cost: 100,
        },
      }),
      prisma.foodyItem.create({
        data: {
          code: 'E2E_GLASSES_B',
          type: FoodyItemType.GLASSES,
          slot: 902,
          cost: 100,
        },
      }),
      prisma.foodyItem.create({
        data: {
          code: 'E2E_EARS_A',
          type: FoodyItemType.EARS,
          slot: 901,
          cost: 100,
        },
      }),
      prisma.foodyItem.create({
        data: {
          code: 'E2E_ANTENNAS_FREE',
          type: FoodyItemType.ANTENNAS,
          slot: 901,
          cost: 0,
        },
      }),
    ]);
  });

  afterAll(async () => {
    // Every user-scoped table cascades from the user row.
    await prisma.user.delete({ where: { id: userId } });
    await prisma.foodyItem.deleteMany({
      where: { id: { in: [glassesA.id, glassesB.id, ears.id, freeItem.id] } },
    });
    await prisma.$disconnect();
  });

  /** Fresh ownership, ledger and balance before each case. */
  async function resetUser(points: number): Promise<void> {
    await prisma.userFoodyItem.deleteMany({ where: { userId } });
    await prisma.walletEntry.deleteMany({ where: { userId } });
    await prisma.userEvent.deleteMany({ where: { userId } });
    await prisma.userGamificationWallet.upsert({
      where: { userId },
      update: { xp: 0, points },
      create: { userId, xp: 0, points },
    });
  }

  it('debits the cost and grants ownership in one transaction', async () => {
    await resetUser(500);

    const result = await service.purchase(userId, 'E2E_GLASSES_A');

    expect(result.pricePaid).toBe(100);
    expect(result.pointsBalance).toBe(400);

    const owned = await prisma.userFoodyItem.findUnique({
      where: { userId_foodyItemId: { userId, foodyItemId: glassesA.id } },
    });
    expect(owned?.pricePaid).toBe(100);

    const wallet = await prisma.userGamificationWallet.findUnique({
      where: { userId },
    });
    expect(wallet?.points).toBe(400);

    const entries = await prisma.walletEntry.findMany({ where: { userId } });
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(-100);
    // balanceAfter is read back from the row the increment wrote.
    expect(entries[0].balanceAfter).toBe(400);
  });

  it('leaves no ownership behind when the balance cannot cover the item', async () => {
    await resetUser(50);

    await expect(
      service.purchase(userId, 'E2E_GLASSES_A'),
    ).rejects.toBeInstanceOf(BadRequestException);

    // The grant is rolled back with the failed debit — no free item.
    const owned = await prisma.userFoodyItem.findMany({ where: { userId } });
    expect(owned).toHaveLength(0);

    const wallet = await prisma.userGamificationWallet.findUnique({
      where: { userId },
    });
    expect(wallet?.points).toBe(50);
  });

  it('lets only one of two concurrent purchases through when points cover one', async () => {
    await resetUser(150);

    const results = await Promise.allSettled([
      service.purchase(userId, 'E2E_GLASSES_A'),
      service.purchase(userId, 'E2E_EARS_A'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);

    const wallet = await prisma.userGamificationWallet.findUnique({
      where: { userId },
    });
    expect(wallet?.points).toBe(50);

    const owned = await prisma.userFoodyItem.findMany({ where: { userId } });
    expect(owned).toHaveLength(1);
  });

  it('keeps one item equipped per category under concurrent equips', async () => {
    await resetUser(500);
    await service.purchase(userId, 'E2E_GLASSES_A');
    await service.purchase(userId, 'E2E_GLASSES_B');

    await Promise.all([
      service.equip(userId, 'E2E_GLASSES_A'),
      service.equip(userId, 'E2E_GLASSES_B'),
    ]);

    const equipped = await prisma.userFoodyItem.findMany({
      where: { userId, equipped: true, item: { type: FoodyItemType.GLASSES } },
    });
    expect(equipped).toHaveLength(1);
  });

  it('records no second event when re-equipping what the user already wears', async () => {
    await resetUser(500);
    await service.purchase(userId, 'E2E_GLASSES_A');

    await service.equip(userId, 'E2E_GLASSES_A');
    await service.equip(userId, 'E2E_GLASSES_A');

    const equipEvents = await prisma.userEvent.count({
      where: { userId, eventType: EventType.FOODY_ITEM_EQUIPPED },
    });
    expect(equipEvents).toBe(1);
  });

  it('claims a free item without writing to the ledger', async () => {
    await resetUser(200);

    const result = await service.purchase(userId, 'E2E_ANTENNAS_FREE');

    expect(result.pricePaid).toBe(0);
    expect(result.pointsBalance).toBe(200);

    const entries = await prisma.walletEntry.findMany({ where: { userId } });
    expect(entries).toHaveLength(0);

    const events = await prisma.userEvent.findMany({ where: { userId } });
    expect(events).toHaveLength(1);
    expect(events[0].idempotencyKey).toBe(
      `foody-purchase:${userId}:${freeItem.id}`,
    );
  });
});
