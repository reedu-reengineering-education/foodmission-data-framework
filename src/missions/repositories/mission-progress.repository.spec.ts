import { Test, TestingModule } from '@nestjs/testing';
import { MissionProgressRepository } from './mission-progress.repository';
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
              findUnique: jest.fn(),
            },
            missionProgress: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
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

  describe('findMissionById', () => {
    it('should call prisma.mission.findUnique', async () => {
      const mockReturn = { id: 'm1', title: 'Mission' };
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findMissionById('m1');
      expect(prisma.mission.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        select: { id: true, code: true, title: true },
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
      const mockReturn = { id: '1' };
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
        },
        update: {
          progress: 50,
          completed: true,
        },
        include: { mission: true },
      });
      expect(result).toBe(mockReturn);
    });
  });
});
