import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FoodyItem,
  FoodyItemType,
  Prisma,
  WalletCurrency,
} from '@prisma/client';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { GamificationProfileService } from '../../gamification/services/gamification-profile.service';
import { GamificationWalletService } from '../../gamification/services/gamification-wallet.service';
import { PrismaService } from '../../database/prisma.service';
import { FoodyRepository } from '../repositories/foody.repository';
import { FoodyService } from './foody.service';

const USER_ID = 'user-1';

function buildItem(overrides: Partial<FoodyItem> = {}): FoodyItem {
  return {
    id: 'item-1',
    code: 'GLASSES_3',
    type: FoodyItemType.GLASSES,
    slot: 3,
    cost: 150,
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('FoodyService', () => {
  let service: FoodyService;
  let repository: jest.Mocked<
    Pick<
      FoodyRepository,
      | 'findAllForUser'
      | 'findEquippedForUser'
      | 'findByCodeOrId'
      | 'findOwnership'
      | 'hasOwnerships'
      | 'lockLoadout'
      | 'grant'
      | 'equipExclusively'
      | 'unequip'
      | 'create'
      | 'update'
      | 'remove'
    >
  >;
  let walletService: jest.Mocked<Pick<GamificationWalletService, 'award'>>;
  let profileService: jest.Mocked<
    Pick<GamificationProfileService, 'getWalletBalance'>
  >;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    repository = {
      findAllForUser: jest.fn(),
      findEquippedForUser: jest.fn(),
      findByCodeOrId: jest.fn(),
      findOwnership: jest.fn(),
      hasOwnerships: jest.fn(),
      lockLoadout: jest.fn(),
      grant: jest.fn(),
      equipExclusively: jest.fn().mockResolvedValue(true),
      unequip: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    repository.hasOwnerships.mockResolvedValue(false);
    walletService = {
      award: jest.fn().mockResolvedValue({
        wallet: { userId: USER_ID, xp: 0, points: 350, updatedAt: new Date() },
        entry: {},
        event: {},
        replayed: false,
      }),
    };
    profileService = {
      getWalletBalance: jest
        .fn()
        .mockResolvedValue({ xp: 0, points: 350, updatedAt: new Date() }),
    };
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(
          async <T>(
            callback: (tx: Prisma.TransactionClient) => Promise<T>,
          ): Promise<T> => callback({} as Prisma.TransactionClient),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodyService,
        { provide: PrismaService, useValue: prisma },
        { provide: FoodyRepository, useValue: repository },
        { provide: GamificationWalletService, useValue: walletService },
        { provide: GamificationProfileService, useValue: profileService },
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get<FoodyService>(FoodyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listForUser', () => {
    it('marks an owned item as unlocked and reports its equipped flag', async () => {
      repository.findAllForUser.mockResolvedValue([
        { ...buildItem(), ownedBy: [{ equipped: true }] },
      ]);

      const [dto] = await service.listForUser(USER_ID, {}, { isAdmin: false });

      expect(dto).toMatchObject({
        code: 'GLASSES_3',
        owned: true,
        locked: false,
        equipped: true,
      });
    });

    it('keeps an unowned item locked', async () => {
      repository.findAllForUser.mockResolvedValue([
        { ...buildItem(), ownedBy: [] },
      ]);

      const [dto] = await service.listForUser(USER_ID, {}, { isAdmin: false });

      expect(dto).toMatchObject({
        owned: false,
        locked: true,
        equipped: false,
      });
    });

    it('forces available=true for non-admins even when they ask for drafts', async () => {
      repository.findAllForUser.mockResolvedValue([]);

      await service.listForUser(
        USER_ID,
        { available: false },
        { isAdmin: false },
      );

      expect(repository.findAllForUser).toHaveBeenCalledWith(USER_ID, {
        type: undefined,
        available: true,
        ownedOnly: undefined,
      });
    });

    it('lets an admin list unavailable items', async () => {
      repository.findAllForUser.mockResolvedValue([]);

      await service.listForUser(
        USER_ID,
        { available: false },
        { isAdmin: true },
      );

      expect(repository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ available: false }),
      );
    });
  });

  describe('getLoadout', () => {
    it('returns the worn item per category and null for the empty ones', async () => {
      repository.findEquippedForUser.mockResolvedValue([
        { ...buildItem(), ownedBy: [{ equipped: true }] },
      ]);

      const loadout = await service.getLoadout(USER_ID);

      expect(loadout.glasses).toMatchObject({ code: 'GLASSES_3' });
      expect(loadout.antennas).toBeNull();
      expect(loadout.ears).toBeNull();
    });
  });

  describe('purchase', () => {
    it('debits the cost in points and grants the item', async () => {
      const item = buildItem();
      const tx = { tx: 'purchase' } as unknown as Prisma.TransactionClient;
      prisma.$transaction.mockImplementation((callback) => callback(tx));
      repository.findByCodeOrId.mockResolvedValue(item);
      repository.findOwnership.mockResolvedValue(null);

      const result = await service.purchase(USER_ID, 'GLASSES_3');

      expect(walletService.award).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          currency: WalletCurrency.POINTS,
          amount: -150,
          eventType: EventType.FOODY_ITEM_PURCHASED,
          source: EventSource.FOODY,
          idempotencyKey: `foody-purchase:${USER_ID}:item-1`,
        }),
        expect.anything(),
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(repository.grant).toHaveBeenCalledWith(USER_ID, 'item-1', 150, tx);
      expect(result).toMatchObject({ pricePaid: 150, pointsBalance: 350 });
      expect(result.item).toMatchObject({ owned: true, locked: false });
      expect(walletService.award).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          currency: WalletCurrency.POINTS,
          amount: -150,
          eventType: EventType.FOODY_ITEM_PURCHASED,
          source: EventSource.FOODY,
          idempotencyKey: `foody-purchase:${USER_ID}:item-1`,
        }),
        tx,
      );
    });

    it('does not touch the wallet for a zero-cost item', async () => {
      const tx = { tx: 'claim' } as unknown as Prisma.TransactionClient;
      prisma.$transaction.mockImplementation((callback) => callback(tx));
      repository.findByCodeOrId.mockResolvedValue(
        buildItem({ code: 'GLASSES_1', slot: 1, cost: 0 }),
      );
      repository.findOwnership.mockResolvedValue(null);

      const result = await service.purchase(USER_ID, 'GLASSES_1');

      expect(walletService.award).not.toHaveBeenCalled();
      // The claim and its event share the one transaction.
      expect(repository.grant).toHaveBeenCalledWith(USER_ID, 'item-1', 0, tx);
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.FOODY_ITEM_PURCHASED,
          idempotencyKey: `foody-purchase:${USER_ID}:item-1`,
        }),
        tx,
      );
      // An unchanged balance is read outside the transaction.
      expect(profileService.getWalletBalance).toHaveBeenCalledWith(USER_ID);
      expect(result.pricePaid).toBe(0);
    });

    it('rejects a second purchase of the same item', async () => {
      repository.findByCodeOrId.mockResolvedValue(buildItem());
      repository.findOwnership.mockResolvedValue({
        userId: USER_ID,
        foodyItemId: 'item-1',
        equipped: false,
        pricePaid: 150,
        acquiredAt: new Date(),
      });

      await expect(service.purchase(USER_ID, 'GLASSES_3')).rejects.toThrow(
        ConflictException,
      );
      expect(walletService.award).not.toHaveBeenCalled();
    });

    it('hides an unavailable item behind a 404', async () => {
      repository.findByCodeOrId.mockResolvedValue(
        buildItem({ available: false }),
      );

      await expect(service.purchase(USER_ID, 'GLASSES_3')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('surfaces the payment failure without compensating outside the transaction', async () => {
      repository.findByCodeOrId.mockResolvedValue(buildItem());
      repository.findOwnership.mockResolvedValue(null);
      walletService.award.mockRejectedValue(
        new BadRequestException('Wallet balance cannot go negative'),
      );

      await expect(service.purchase(USER_ID, 'GLASSES_3')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(profileService.getWalletBalance).not.toHaveBeenCalled();
    });

    it('rejects the loser of a concurrent purchase without charging it', async () => {
      repository.findByCodeOrId.mockResolvedValue(buildItem());
      repository.findOwnership.mockResolvedValue(null);
      repository.grant.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.purchase(USER_ID, 'GLASSES_3')).rejects.toThrow(
        ConflictException,
      );
      expect(walletService.award).not.toHaveBeenCalled();
    });
  });

  describe('equip', () => {
    it('equips an owned item exclusively within its category', async () => {
      const item = buildItem();
      const tx = { tx: 'equip' } as unknown as Prisma.TransactionClient;
      prisma.$transaction.mockImplementation((callback) => callback(tx));
      repository.findByCodeOrId.mockResolvedValue(item);
      repository.findOwnership.mockResolvedValue({
        userId: USER_ID,
        foodyItemId: 'item-1',
        equipped: false,
        pricePaid: 150,
        acquiredAt: new Date(),
      });

      const dto = await service.equip(USER_ID, 'GLASSES_3');

      expect(repository.equipExclusively).toHaveBeenCalledWith(
        USER_ID,
        item,
        tx,
      );
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          eventType: EventType.FOODY_ITEM_EQUIPPED,
          source: EventSource.FOODY,
        }),
        tx,
      );
      expect(dto.equipped).toBe(true);
    });

    it('refuses to equip an item the user does not own', async () => {
      repository.findByCodeOrId.mockResolvedValue(buildItem());
      repository.findOwnership.mockResolvedValue(null);

      await expect(service.equip(USER_ID, 'GLASSES_3')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.equipExclusively).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('defaults cost to 0 when the admin omits it', async () => {
      repository.create.mockResolvedValue(buildItem({ cost: 0, slot: 1 }));

      await service.create({
        code: 'GLASSES_1',
        type: FoodyItemType.GLASSES,
        slot: 1,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ cost: 0 }),
      );
    });
  });

  describe('update', () => {
    it('rejects changing the type after the item has been owned', async () => {
      repository.findByCodeOrId.mockResolvedValue(buildItem());
      repository.hasOwnerships.mockResolvedValue(true);

      await expect(
        service.update('item-1', { type: FoodyItemType.EARS }),
      ).rejects.toThrow(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows changing other fields when ownership exists', async () => {
      repository.findByCodeOrId.mockResolvedValue(buildItem());
      repository.hasOwnerships.mockResolvedValue(true);
      repository.update.mockResolvedValue(buildItem({ cost: 175 }));

      const result = await service.update('item-1', { cost: 175 });

      expect(repository.update).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ cost: 175 }),
      );
      expect(result.cost).toBe(175);
    });
  });
});
