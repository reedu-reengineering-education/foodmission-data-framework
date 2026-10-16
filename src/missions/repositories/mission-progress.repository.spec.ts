import { Test, TestingModule } from '@nestjs/testing';
import { MissionProgressRepository } from './mission-progress.repository';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

describe('MissionProgressRepository', () => {
  let repository: MissionProgressRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionProgressRepository,
        {
          provide: PrismaService,
          useValue: {
            mission: {
              findFirst: jest.fn(),
            },
            missionProgress: {
              findUnique: jest.fn(),
              findUniqueOrThrow: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<MissionProgressRepository>(
      MissionProgressRepository,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findMissionByCodeOrId', () => {
    it('should look up by id when the param is a UUID', async () => {
      const mockReturn = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Mission',
      };
      (prisma.mission.findFirst as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findMissionByCodeOrId(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(prisma.mission.findFirst).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        select: {
          id: true,
          code: true,
          title: true,
          reward: { select: { id: true, xp: true, points: true } },
        },
      });
      expect(result).toBe(mockReturn);
    });

    it('should look up by code otherwise', async () => {
      const mockReturn = { id: 'm1', code: 'M.A1.1', title: 'Mission' };
      (prisma.mission.findFirst as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findMissionByCodeOrId('M.A1.1');
      expect(prisma.mission.findFirst).toHaveBeenCalledWith({
        where: { code: 'M.A1.1' },
        select: {
          id: true,
          code: true,
          title: true,
          reward: { select: { id: true, xp: true, points: true } },
        },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findByUserIdAndMissionId', () => {
    it('should call prisma.missionProgress.findUnique with correct params', async () => {
      const mockReturn = { id: '1' };
      (prisma.missionProgress.findUnique as jest.Mock).mockResolvedValue(
        mockReturn,
      );
      const result = await repository.findByUserIdAndMissionId('u1', 'm1');
      expect(prisma.missionProgress.findUnique).toHaveBeenCalledWith({
        where: { userId_missionId: { userId: 'u1', missionId: 'm1' } },
        include: { mission: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findAllByUserId', () => {
    it('should call prisma.missionProgress.findMany with correct params', async () => {
      const mockReturn = [{ id: '1' }];
      (prisma.missionProgress.findMany as jest.Mock).mockResolvedValue(
        mockReturn,
      );
      const result = await repository.findAllByUserId('u1');
      expect(prisma.missionProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: { mission: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('upsert', () => {
    it('should call prisma.missionProgress.upsert with create defaults', async () => {
      const mockReturn = { id: '1', startedAt: new Date() };
      (prisma.missionProgress.upsert as jest.Mock).mockResolvedValue(
        mockReturn,
      );
      const result = await repository.upsert('u1', 'm1', {
        completed: true,
        progress: 50,
      });
      expect(prisma.missionProgress.upsert).toHaveBeenCalledWith({
        where: { userId_missionId: { userId: 'u1', missionId: 'm1' } },
        create: {
          userId: 'u1',
          missionId: 'm1',
          progress: 50,
          completed: true,
          status: 'COMPLETED',
          state: { source: 'manual', mode: 'api' },
          startedAt: expect.any(Date),
        },
        update: {
          progress: 50,
          completed: true,
          status: 'COMPLETED',
          state: { source: 'manual', mode: 'api' },
        },
        include: { mission: true },
      });
      expect(result).toBe(mockReturn);
    });

    it('marks the mission FAILED and not completed when given up', async () => {
      (prisma.missionProgress.upsert as jest.Mock).mockResolvedValue({
        startedAt: new Date(),
      });

      await repository.upsert('u1', 'm1', { failed: true, progress: 40 });

      const call = (prisma.missionProgress.upsert as jest.Mock).mock
        .calls[0][0];
      expect(call.create).toEqual(
        expect.objectContaining({ status: 'FAILED', completed: false }),
      );
      expect(call.update).toEqual(
        expect.objectContaining({ status: 'FAILED', completed: false }),
      );
    });

    it('starts the mission at progress 0: IN_PROGRESS with a start time', async () => {
      (prisma.missionProgress.upsert as jest.Mock).mockResolvedValue({
        startedAt: new Date(),
      });

      await repository.upsert('u1', 'm1', { progress: 0 });

      const call = (prisma.missionProgress.upsert as jest.Mock).mock
        .calls[0][0];
      expect(call.create).toEqual(
        expect.objectContaining({
          progress: 0,
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('restart', () => {
    it("stores the new attempt's inputs", async () => {
      (prisma.missionProgress.update as jest.Mock).mockResolvedValue({});

      await repository.restart('u1', 'm1', { previousMeatMeals: 3 });

      expect(
        (prisma.missionProgress.update as jest.Mock).mock.calls[0][0].data
          .inputs,
      ).toEqual({ previousMeatMeals: 3 });
    });

    it('resets the row for a new attempt with a fresh start time', async () => {
      const row = { startedAt: new Date() };
      (prisma.missionProgress.update as jest.Mock).mockResolvedValue(row);

      const result = await repository.restart('u1', 'm1');

      expect(prisma.missionProgress.update).toHaveBeenCalledWith({
        where: { userId_missionId: { userId: 'u1', missionId: 'm1' } },
        data: {
          progress: 0,
          completed: false,
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date),
          state: { source: 'manual', mode: 'restart' },
          inputs: Prisma.DbNull,
          ruleHash: null,
          evaluatedAt: null,
        },
        include: { mission: true },
      });
      expect(result).toBe(row);
    });
  });

  describe('start', () => {
    it('creates the row at 0 with a start time and reports it created', async () => {
      const row = { startedAt: new Date() };
      (prisma.missionProgress.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.missionProgress.findUniqueOrThrow as jest.Mock).mockResolvedValue(
        row,
      );

      const result = await repository.start('u1', 'm1');

      expect(prisma.missionProgress.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'u1',
            missionId: 'm1',
            progress: 0,
            completed: false,
            status: 'IN_PROGRESS',
            state: { source: 'manual', mode: 'start' },
            startedAt: expect.any(Date),
            inputs: Prisma.DbNull,
          },
        ],
        skipDuplicates: true,
      });
      expect(result).toEqual({ row, created: true });
    });

    it('stores the inputs the user set', async () => {
      (prisma.missionProgress.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.missionProgress.findUniqueOrThrow as jest.Mock).mockResolvedValue(
        {},
      );

      await repository.start('u1', 'm1', { previousMeatMeals: 5 });

      expect(
        (prisma.missionProgress.createMany as jest.Mock).mock.calls[0][0]
          .data[0].inputs,
      ).toEqual({ previousMeatMeals: 5 });
    });

    it('leaves an existing row untouched', async () => {
      const row = { progress: 40, startedAt: new Date() };
      (prisma.missionProgress.createMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.missionProgress.findUniqueOrThrow as jest.Mock).mockResolvedValue(
        row,
      );

      const result = await repository.start('u1', 'm1');

      expect(result).toEqual({ row, created: false });
    });
  });
});
