import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProgressIndicatorKind, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UserEventService } from '../../events/services/user-event.service';
import { EventType } from '../../events/event-types';
import { ProgressWheelService } from './progress-wheel.service';
import { SUSTAINABILITY_WHEEL_KINDS } from '../progress-wheels.config';

describe('ProgressWheelService', () => {
  let service: ProgressWheelService;
  let prisma: {
    user: { findUnique: jest.Mock };
    progressIndicator: { upsert: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;
  let tx: {
    $queryRaw: jest.Mock;
    progressIndicator: { update: jest.Mock };
    user: { update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      progressIndicator: { upsert: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    tx = {
      $queryRaw: jest.fn(),
      progressIndicator: { update: jest.fn() },
      user: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) =>
      fn(tx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressWheelService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserEventService, useValue: userEventService },
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

  describe('recordImpact', () => {
    function mockRow(
      kind: ProgressIndicatorKind,
      overrides: Partial<Record<string, unknown>> = {},
    ) {
      return {
        id: `row-${kind}`,
        level: 1,
        accumulatedValue: 0,
        targetValue: 5,
        allTimeTotal: 0,
        ...overrides,
      };
    }

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({
        segment: UserSegment.BEGINNER,
      });
      prisma.progressIndicator.upsert.mockResolvedValue({});
      tx.user.update.mockResolvedValue({});
      tx.progressIndicator.update.mockImplementation(({ where, data }: any) => {
        const kind =
          where.userId_kind?.kind ?? String(where.id).replace(/^row-/, '');
        return { id: where.id ?? `row-${kind}`, userId: 'u1', kind, ...data };
      });
    });

    it('rejects an unknown action code', async () => {
      await expect(
        service.recordImpact('u1', 'NOT_A_REAL_ACTION'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.recordImpact('u1', 'VEGETARIAN_SERVING_100G'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the user has no profile yet', async () => {
      prisma.user.findUnique.mockResolvedValue({ segment: null });

      await expect(
        service.recordImpact('u1', 'VEGETARIAN_SERVING_100G'),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds the delta to every affected wheel without completing a stage', async () => {
      // BEGINNER stage-1 targets: CO2 5, ENERGY 5, WATER 50, LAND 2 — all
      // comfortably above a single serving's impact.
      tx.$queryRaw
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.CO2_REDUCTION, { targetValue: 5 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.ENERGY_REDUCTION, { targetValue: 5 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.WATER_SAVINGS, { targetValue: 50 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.LAND_USE_REDUCTION, {
            targetValue: 2,
          }),
        ]);

      const result = await service.recordImpact(
        'u1',
        'VEGETARIAN_SERVING_100G',
      );

      expect(tx.progressIndicator.update).toHaveBeenCalledTimes(4);
      expect(tx.progressIndicator.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: `row-${ProgressIndicatorKind.CO2_REDUCTION}` },
          data: expect.objectContaining({
            level: 1,
            accumulatedValue: 0.6,
            targetValue: 5,
            allTimeTotal: 0.6,
          }),
        }),
      );
      expect(result.achievements).toEqual([]);
      expect(result.wheels).toHaveLength(4);
      expect(result.dimensionPromotion).toBeNull();
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          eventType: EventType.PROGRESS_INDICATOR_UPDATED,
          metadata: expect.objectContaining({
            actionCode: 'VEGETARIAN_SERVING_100G',
          }),
        }),
        tx,
      );
    });

    it('completes a stage and rolls the excess into the next one', async () => {
      // CO2 wheel is 0.1 short of its stage-1 target (5); the 0.6 delta
      // pushes it 0.5 over, so it should advance to stage 2 (target 10)
      // with that 0.5 carried into the new cycle.
      tx.$queryRaw
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.CO2_REDUCTION, {
            accumulatedValue: 4.9,
            targetValue: 5,
          }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.ENERGY_REDUCTION, { targetValue: 5 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.WATER_SAVINGS, { targetValue: 50 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.LAND_USE_REDUCTION, {
            targetValue: 2,
          }),
        ]);

      const result = await service.recordImpact(
        'u1',
        'VEGETARIAN_SERVING_100G',
      );

      expect(tx.progressIndicator.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            level: 2,
            targetValue: 10,
            accumulatedValue: expect.closeTo(0.5, 5),
            cycleStartedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.achievements).toEqual([
        { kind: ProgressIndicatorKind.CO2_REDUCTION, stagesCompleted: 1 },
      ]);
      expect(result.dimensionPromotion).toBeNull();
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('promotes BEGINNER to INTERMEDIATE and resets all wheels when stage 5 completes', async () => {
      // BEGINNER CO2 stage 5 target is 25; already at 24.5, so the 0.6
      // delta completes it — with no stage 6 to advance to, the user's
      // dimension should promote instead, and every wheel reset to stage 1
      // of the new (INTERMEDIATE) targets.
      tx.$queryRaw
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.CO2_REDUCTION, {
            level: 5,
            accumulatedValue: 24.5,
            targetValue: 25,
          }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.ENERGY_REDUCTION, {
            level: 3,
            accumulatedValue: 2,
            targetValue: 15,
          }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.WATER_SAVINGS, { targetValue: 50 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.LAND_USE_REDUCTION, {
            targetValue: 2,
          }),
        ]);

      const result = await service.recordImpact(
        'u1',
        'VEGETARIAN_SERVING_100G',
      );

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { segment: UserSegment.INTERMEDIATE },
      });
      // All four wheels reset to stage 1 of INTERMEDIATE, including the
      // ENERGY wheel that was mid-cycle at stage 3 and hadn't completed
      // anything itself this call.
      expect(tx.progressIndicator.update).toHaveBeenCalledTimes(8); // 4 deltas + 4 resets
      expect(tx.progressIndicator.update).toHaveBeenCalledWith({
        where: {
          userId_kind: {
            userId: 'u1',
            kind: ProgressIndicatorKind.ENERGY_REDUCTION,
          },
        },
        data: {
          level: 1,
          accumulatedValue: 0,
          targetValue: 15, // INTERMEDIATE stage-1 target
          cycleStartedAt: expect.any(Date),
        },
      });
      expect(result.dimensionPromotion).toEqual({
        from: UserSegment.BEGINNER,
        to: UserSegment.INTERMEDIATE,
      });
      expect(result.wheels).toHaveLength(4);
      expect(
        result.wheels.every(
          (w) => w.stage === 1 && w.profile === UserSegment.INTERMEDIATE,
        ),
      ).toBe(true);
    });

    it('keeps repeating stage 5 once already at ADVANCED (no higher dimension)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        segment: UserSegment.ADVANCED,
      });
      // ADVANCED CO2 stage 5 target is 90.
      tx.$queryRaw
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.CO2_REDUCTION, {
            level: 5,
            accumulatedValue: 89.5,
            targetValue: 90,
          }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.ENERGY_REDUCTION, { targetValue: 90 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.WATER_SAVINGS, { targetValue: 900 }),
        ])
        .mockResolvedValueOnce([
          mockRow(ProgressIndicatorKind.LAND_USE_REDUCTION, {
            targetValue: 36,
          }),
        ]);

      const result = await service.recordImpact(
        'u1',
        'VEGETARIAN_SERVING_100G',
      );

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.progressIndicator.update).toHaveBeenCalledTimes(4);
      expect(tx.progressIndicator.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            level: 5,
            targetValue: 90,
            accumulatedValue: expect.closeTo(0.1, 5),
          }),
        }),
      );
      expect(result.achievements).toEqual([
        { kind: ProgressIndicatorKind.CO2_REDUCTION, stagesCompleted: 1 },
      ]);
      expect(result.dimensionPromotion).toBeNull();
    });
  });
});
