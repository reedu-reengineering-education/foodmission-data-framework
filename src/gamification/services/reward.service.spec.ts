import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RewardService } from './reward.service';

describe('RewardService', () => {
  let service: RewardService;
  let prisma: {
    reward: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      reward: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RewardService);
  });

  describe('create', () => {
    it('creates a reward with points and xp', async () => {
      const input = {
        name: 'quest-reward',
        points: 100,
        xp: 50,
        badgeId: 'badge-1',
      };

      const expected = {
        id: 'reward-1',
        name: 'quest-reward',
        points: 100,
        xp: 50,
        badgeId: 'badge-1',
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.create.mockResolvedValue(expected);

      const result = await service.create(input);

      expect(result).toEqual(expected);
      expect(prisma.reward.create).toHaveBeenCalledWith({
        data: {
          name: 'quest-reward',
          points: 100,
          xp: 50,
          badgeId: 'badge-1',
          avatarItem: null,
          petItem: null,
          collectible: null,
          collectibleShareable: false,
        },
      });
    });

    it('creates a reward with only points', async () => {
      const input = {
        name: 'points-only-reward',
        points: 50,
      };

      const expected = {
        id: 'reward-2',
        name: 'points-only-reward',
        points: 50,
        xp: null,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.create.mockResolvedValue(expected);

      const result = await service.create(input);

      expect(result.points).toBe(50);
      expect(result.xp).toBeNull();
    });

    it('creates a reward with only xp', async () => {
      const input = {
        name: 'xp-only-reward',
        xp: 75,
      };

      const expected = {
        id: 'reward-3',
        name: 'xp-only-reward',
        points: null,
        xp: 75,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.create.mockResolvedValue(expected);

      const result = await service.create(input);

      expect(result.xp).toBe(75);
      expect(result.points).toBeNull();
    });

    it('throws BadRequestException when neither points nor xp provided', async () => {
      const input = {
        name: 'invalid-reward',
      };

      await expect(service.create(input as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.reward.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when reward name already exists', async () => {
      const input = {
        name: 'duplicate-name',
        points: 50,
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`name`)',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.reward.create.mockRejectedValue(prismaError);

      await expect(service.create(input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('getById', () => {
    it('returns a reward when found', async () => {
      const reward = {
        id: 'reward-1',
        name: 'test-reward',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.findUnique.mockResolvedValue(reward);

      const result = await service.getById('reward-1');

      expect(result).toEqual(reward);
      expect(prisma.reward.findUnique).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
      });
    });

    it('throws NotFoundException when reward not found', async () => {
      prisma.reward.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getByName', () => {
    it('returns a reward when found', async () => {
      const reward = {
        id: 'reward-1',
        name: 'quest-reward',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.findUnique.mockResolvedValue(reward);

      const result = await service.getByName('quest-reward');

      expect(result).toEqual(reward);
      expect(prisma.reward.findUnique).toHaveBeenCalledWith({
        where: { name: 'quest-reward' },
      });
    });

    it('throws NotFoundException when reward not found', async () => {
      prisma.reward.findUnique.mockResolvedValue(null);

      await expect(service.getByName('nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('returns all rewards', async () => {
      const rewards = [
        {
          id: 'reward-1',
          name: 'reward-1',
          points: 100,
          xp: 50,
          badgeId: null,
          avatarItem: null,
          petItem: null,
          collectible: null,
          collectibleShareable: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'reward-2',
          name: 'reward-2',
          points: 50,
          xp: 25,
          badgeId: null,
          avatarItem: null,
          petItem: null,
          collectible: null,
          collectibleShareable: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.reward.findMany.mockResolvedValue(rewards);

      const result = await service.list();

      expect(result).toEqual(rewards);
      expect(prisma.reward.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'asc' },
      });
    });

    it('supports pagination with skip and take', async () => {
      const rewards = [];
      prisma.reward.findMany.mockResolvedValue(rewards);

      await service.list({ skip: 10, take: 5 });

      expect(prisma.reward.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns empty list when no rewards exist', async () => {
      prisma.reward.findMany.mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates a reward', async () => {
      const reward = {
        id: 'reward-1',
        name: 'old-name',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = {
        ...reward,
        name: 'new-name',
        points: 200,
      };

      prisma.reward.findUnique.mockResolvedValue(reward);
      prisma.reward.update.mockResolvedValue(updated);

      const result = await service.update('reward-1', {
        name: 'new-name',
        points: 200,
      });

      expect(result.name).toBe('new-name');
      expect(result.points).toBe(200);
      expect(prisma.reward.update).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
        data: {
          name: 'new-name',
          points: 200,
          xp: undefined,
          badgeId: undefined,
          avatarItem: undefined,
          petItem: undefined,
          collectible: undefined,
          collectibleShareable: undefined,
        },
      });
    });

    it('throws NotFoundException when reward does not exist', async () => {
      prisma.reward.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { points: 50 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when updating to duplicate name', async () => {
      const reward = {
        id: 'reward-1',
        name: 'old-name',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`name`)',
        { code: 'P2002', clientVersion: '5.0.0' },
      );

      prisma.reward.findUnique.mockResolvedValue(reward);
      prisma.reward.update.mockRejectedValue(prismaError);

      await expect(
        service.update('reward-1', { name: 'duplicate-name' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException when trying to remove both currencies', async () => {
      const reward = {
        id: 'reward-1',
        name: 'test-reward',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.findUnique.mockResolvedValue(reward);

      await expect(
        service.update('reward-1', { points: null, xp: null }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('delete', () => {
    it('deletes a reward', async () => {
      const reward = {
        id: 'reward-1',
        name: 'test-reward',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reward.findUnique.mockResolvedValue(reward);
      prisma.reward.delete.mockResolvedValue(reward);

      await service.delete('reward-1');

      expect(prisma.reward.delete).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
      });
    });

    it('throws NotFoundException when reward does not exist', async () => {
      prisma.reward.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.reward.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when reward is in use', async () => {
      const reward = {
        id: 'reward-1',
        name: 'in-use-reward',
        points: 100,
        xp: 50,
        badgeId: null,
        avatarItem: null,
        petItem: null,
        collectible: null,
        collectibleShareable: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: `rewardId`',
        { code: 'P2003', clientVersion: '5.0.0' },
      );

      prisma.reward.findUnique.mockResolvedValue(reward);
      prisma.reward.delete.mockRejectedValue(prismaError);

      await expect(service.delete('reward-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('count', () => {
    it('returns total reward count', async () => {
      prisma.reward.count.mockResolvedValue(42);

      const result = await service.count();

      expect(result).toBe(42);
      expect(prisma.reward.count).toHaveBeenCalledWith();
    });

    it('returns 0 when no rewards exist', async () => {
      prisma.reward.count.mockResolvedValue(0);

      const result = await service.count();

      expect(result).toBe(0);
    });
  });
});
