import { Test, TestingModule } from '@nestjs/testing';
import { MissionsRepository } from './missions.repository';
import { PrismaService } from '../../database/prisma.service';

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
            missions: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findMany: jest.fn(),
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
    it('should call prisma.missions.create with missionProgresses for all users', async () => {
      const data = {
        userId: 'u1',
        title: 't',
        description: 'd',
        available: true,
        startDate: new Date(),
        endDate: new Date(),
      };
      const mockUsers = [{ id: 'u1' }, { id: 'u2' }];
      const mockReturn = { id: 'm1', missionProgresses: [] };
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.missions.create as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.create(data);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
      expect(prisma.missions.create).toHaveBeenCalledWith({
        data: {
          title: data.title,
          description: data.description,
          available: data.available,
          startDate: data.startDate,
          endDate: data.endDate,
          missionProgresses: {
            create: [
              { userId: 'u1', progress: 0, completed: false },
              { userId: 'u2', progress: 0, completed: false },
            ],
          },
        },
        include: { missionProgresses: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findById', () => {
    it('should call prisma.missions.findUnique with include missionProgresses', async () => {
      const mockReturn = { id: 'm1', missionProgresses: [] };
      (prisma.missions.findUnique as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findById('m1');
      expect(prisma.missions.findUnique).toHaveBeenCalledWith({
        where: { id: 'm1' },
        include: { missionProgresses: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findAll', () => {
    it('should call prisma.missions.findMany with include missionProgresses', async () => {
      const mockReturn = [{ id: 'm1', missionProgresses: [] }];
      (prisma.missions.findMany as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findAll();
      expect(prisma.missions.findMany).toHaveBeenCalledWith({
        include: { missionProgresses: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('update', () => {
    it('should call prisma.missions.update with include missionProgresses', async () => {
      const mockReturn = { id: 'm1', missionProgresses: [] };
      const updateData = { available: false };
      (prisma.missions.update as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.update('m1', updateData);
      expect(prisma.missions.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: {
          title: undefined,
          description: undefined,
          available: updateData.available,
          startDate: undefined,
          endDate: undefined,
        },
        include: { missionProgresses: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('delete', () => {
    it('should call prisma.missions.delete with correct params', async () => {
      (prisma.missions.delete as jest.Mock).mockResolvedValue(undefined);
      await repository.delete('m1');
      expect(prisma.missions.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
    });
  });
});
