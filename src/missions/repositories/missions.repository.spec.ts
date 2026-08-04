import { Test, TestingModule } from '@nestjs/testing';
import { MissionsRepository } from './missions.repository';
import { PrismaService } from '../../database/prisma.service';
import { ContentLevel } from '@prisma/client';

describe('MissionsRepository', () => {
  let repository: MissionsRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsRepository,
        {
          provide: PrismaService,
          useValue: {
            mission: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<MissionsRepository>(MissionsRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call prisma.mission.create without pre-seeding progress', async () => {
      const data = {
        code: 'M.B1.1',
        dimensionId: 'dim-1',
        level: ContentLevel.BEGINNER,
        title: 't',
        duration: '1 week',
        goal: 'g',
        whyItMatters: 'w',
        available: true,
      };
      const mockReturn = { id: 'm1' };
      (prisma.mission.create as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.create(data);
      expect(prisma.mission.create).toHaveBeenCalledWith({
        data: {
          code: data.code,
          dimensionId: data.dimensionId,
          topicId: undefined,
          level: data.level,
          title: data.title,
          duration: data.duration,
          goal: data.goal,
          whyItMatters: data.whyItMatters,
          health: false,
          foodChoice: false,
          foodWaste: false,
          available: data.available,
        },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findById', () => {
    it('should call prisma.mission.findUnique with include missionProgresses', async () => {
      const mockReturn = { id: 'm1', missionProgresses: [] };
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findById('m1');
      expect(prisma.mission.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        include: { missionProgresses: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findAll', () => {
    it('should call prisma.mission.findMany with include missionProgresses', async () => {
      const mockReturn = [{ id: 'm1', missionProgresses: [] }];
      (prisma.mission.findMany as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findAll();
      expect(prisma.mission.findMany).toHaveBeenCalledWith({
        where: {},
        include: { missionProgresses: true },
        orderBy: { code: 'asc' },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('update', () => {
    it('should call prisma.mission.update with include missionProgresses', async () => {
      const mockReturn = { id: 'm1', missionProgresses: [] };
      const updateData = { available: false };
      (prisma.mission.update as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.update('m1', updateData);
      expect(prisma.mission.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: {
          code: undefined,
          dimensionId: undefined,
          topicId: undefined,
          level: undefined,
          title: undefined,
          duration: undefined,
          goal: undefined,
          whyItMatters: undefined,
          health: undefined,
          foodChoice: undefined,
          foodWaste: undefined,
          available: updateData.available,
        },
        include: { missionProgresses: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('delete', () => {
    it('should call prisma.mission.delete with correct params', async () => {
      (prisma.mission.delete as jest.Mock).mockResolvedValue(undefined);
      await repository.delete('m1');
      expect(prisma.mission.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
    });
  });
});
