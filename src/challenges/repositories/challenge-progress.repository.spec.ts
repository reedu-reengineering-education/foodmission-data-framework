import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeProgressRepository } from './challenge-progress.repository';
import { PrismaService } from '../../database/prisma.service';

describe('ChallengeProgressRepository', () => {
  let repository: ChallengeProgressRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeProgressRepository,
        {
          provide: PrismaService,
          useValue: {
            challenge: {
              findFirst: jest.fn(),
            },
            challengeProgress: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ChallengeProgressRepository>(
      ChallengeProgressRepository,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findChallengeByCodeOrId', () => {
    it('should look up by id when the param is a UUID', async () => {
      const mockReturn = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Challenge',
      };
      (prisma.challenge.findFirst as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findChallengeByCodeOrId(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(prisma.challenge.findFirst).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        include: { reward: { select: { id: true, xp: true, points: true } } },
      });
      expect(result).toBe(mockReturn);
    });

    it('should look up by code otherwise', async () => {
      const mockReturn = { id: 'c1', code: 'CH.A1.1', title: 'Challenge' };
      (prisma.challenge.findFirst as jest.Mock).mockResolvedValue(mockReturn);
      const result = await repository.findChallengeByCodeOrId('CH.A1.1');
      expect(prisma.challenge.findFirst).toHaveBeenCalledWith({
        where: { code: 'CH.A1.1' },
        include: { reward: { select: { id: true, xp: true, points: true } } },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findByUserIdAndChallengeId', () => {
    it('should call prisma.challengeProgress.findUnique with correct params', async () => {
      const mockReturn = {
        userId: 'u1',
        challengeId: 'c1',
        completed: false,
        progress: 0.5,
        challenge: { title: 'Test' },
      };
      (prisma.challengeProgress.findUnique as jest.Mock).mockResolvedValue(
        mockReturn,
      );
      const result = await repository.findByUserIdAndChallengeId('u1', 'c1');
      expect(prisma.challengeProgress.findUnique).toHaveBeenCalledWith({
        where: { userId_challengeId: { userId: 'u1', challengeId: 'c1' } },
        include: { challenge: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('findAllByUserId', () => {
    it('should call prisma.challengeProgress.findMany with correct params', async () => {
      const mockReturn = [{ userId: 'u1', challengeId: 'c1' }];
      (prisma.challengeProgress.findMany as jest.Mock).mockResolvedValue(
        mockReturn,
      );
      const result = await repository.findAllByUserId('u1');
      expect(prisma.challengeProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: { challenge: true },
      });
      expect(result).toBe(mockReturn);
    });
  });

  describe('upsert', () => {
    it('should call prisma.challengeProgress.upsert', async () => {
      const mockReturn = {
        userId: 'u1',
        challengeId: 'c1',
        completed: true,
        progress: 1,
      };
      (prisma.challengeProgress.upsert as jest.Mock).mockResolvedValue(
        mockReturn,
      );
      const result = await repository.upsert('u1', 'c1', {
        completed: true,
        progress: 1,
      });
      expect(prisma.challengeProgress.upsert).toHaveBeenCalledWith({
        where: { userId_challengeId: { userId: 'u1', challengeId: 'c1' } },
        create: {
          userId: 'u1',
          challengeId: 'c1',
          progress: 1,
          completed: true,
        },
        update: {
          progress: 1,
          completed: true,
        },
        include: { challenge: true },
      });
      expect(result).toBe(mockReturn);
    });
  });
});
