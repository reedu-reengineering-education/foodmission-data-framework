import { Test, TestingModule } from '@nestjs/testing';
import { ChallengesRepository } from './challenges.repository';
import { PrismaService } from '../../database/prisma.service';
import { ContentLevel } from '@prisma/client';

describe('ChallengesRepository', () => {
  let repository: ChallengesRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesRepository,
        {
          provide: PrismaService,
          useValue: {
            challenge: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ChallengesRepository>(ChallengesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create challenge without pre-seeding progress', async () => {
      const dto = {
        code: 'CH.B1.1',
        dimensionId: 'dim-1',
        level: ContentLevel.BEGINNER,
        title: 'Test',
        task: 'Task',
        whyItMatters: 'Why',
        tags: ['FOOD_CHOICE'],
        available: true,
      };
      const mockChallenge = { id: 'c1', ...dto };

      (prisma.challenge.create as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await repository.create(dto);

      expect(prisma.challenge.create).toHaveBeenCalledWith({
        data: {
          code: dto.code,
          dimensionId: dto.dimensionId,
          topicId: undefined,
          level: dto.level,
          title: dto.title,
          task: dto.task,
          whyItMatters: dto.whyItMatters,
          health: false,
          foodChoice: true,
          foodWaste: false,
          available: dto.available,
        },
      });
      expect(result).toBe(mockChallenge);
    });
  });

  describe('findAll', () => {
    it('should return all challenges with progress', async () => {
      const mockChallenges = [{ id: 'c1', challengeProgresses: [] }];
      (prisma.challenge.findMany as jest.Mock).mockResolvedValue(
        mockChallenges,
      );

      const result = await repository.findAll();

      expect(prisma.challenge.findMany).toHaveBeenCalledWith({
        where: {},
        include: { challengeProgresses: true },
        orderBy: { code: 'asc' },
      });
      expect(result).toBe(mockChallenges);
    });
  });

  describe('findById', () => {
    it('should return challenge by id with progress', async () => {
      const mockChallenge = { id: 'c1', challengeProgresses: [] };
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(
        mockChallenge,
      );

      const result = await repository.findById('c1');

      expect(prisma.challenge.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        include: { challengeProgresses: true },
      });
      expect(result).toBe(mockChallenge);
    });

    it('should return null if challenge not found', async () => {
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update challenge', async () => {
      const updateDto = { available: false };
      const mockChallenge = { id: 'c1', available: false };
      (prisma.challenge.update as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await repository.update('c1', updateDto);

      expect(prisma.challenge.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { available: false },
      });
      expect(result).toBe(mockChallenge);
    });
  });

  describe('delete', () => {
    it('should delete challenge', async () => {
      const mockChallenge = { id: 'c1' };
      (prisma.challenge.delete as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await repository.delete('c1');

      expect(prisma.challenge.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(result).toBe(mockChallenge);
    });
  });
});
