import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProgressIndicatorKind, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProgressWheelService } from './progress-wheel.service';
import { SUSTAINABILITY_WHEEL_KINDS } from '../progress-wheels.config';

describe('ProgressWheelService', () => {
  let service: ProgressWheelService;
  let prisma: {
    user: { findUnique: jest.Mock };
    progressIndicator: { upsert: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      progressIndicator: { upsert: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressWheelService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProgressWheelService);
  });

  describe('ensureWheelsForUser', () => {
    it('upserts all four sustainability wheels at stage 1', async () => {
      prisma.progressIndicator.upsert.mockResolvedValue({});

      await service.ensureWheelsForUser('u1', UserSegment.BEGINNER);

      expect(prisma.progressIndicator.upsert).toHaveBeenCalledTimes(
        SUSTAINABILITY_WHEEL_KINDS.length,
      );
      expect(prisma.progressIndicator.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_kind: {
              userId: 'u1',
              kind: ProgressIndicatorKind.CO2_REDUCTION,
            },
          },
          create: expect.objectContaining({
            userId: 'u1',
            kind: ProgressIndicatorKind.CO2_REDUCTION,
            level: 1,
            accumulatedValue: 0,
            targetValue: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('getWheelsForUser', () => {
    it('throws when user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getWheelsForUser('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns no wheels when the user has no segment yet', async () => {
      prisma.user.findUnique.mockResolvedValue({ segment: null });

      const result = await service.getWheelsForUser('u1');

      expect(result).toEqual([]);
      expect(prisma.progressIndicator.upsert).not.toHaveBeenCalled();
    });

    it('ensures wheels exist, then maps them for display', async () => {
      prisma.user.findUnique.mockResolvedValue({
        segment: UserSegment.INTERMEDIATE,
      });
      prisma.progressIndicator.upsert.mockResolvedValue({});
      prisma.progressIndicator.findMany.mockResolvedValue([
        {
          id: 'pi-1',
          kind: ProgressIndicatorKind.CO2_REDUCTION,
          level: 1,
          accumulatedValue: 5,
          targetValue: 15,
          allTimeTotal: 5,
          cycleStartedAt: new Date('2026-07-01T00:00:00Z'),
          lastUpdatedAt: new Date('2026-07-02T00:00:00Z'),
        },
      ]);

      const result = await service.getWheelsForUser('u1');

      expect(prisma.progressIndicator.upsert).toHaveBeenCalledTimes(
        SUSTAINABILITY_WHEEL_KINDS.length,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'pi-1',
        kind: ProgressIndicatorKind.CO2_REDUCTION,
        label: 'CO₂ Reduction',
        unit: 'kg CO2e',
        profile: UserSegment.INTERMEDIATE,
        stage: 1,
        accumulatedValue: 5,
        targetValue: 15,
        percentComplete: (5 / 15) * 100,
      });
    });
  });
});
