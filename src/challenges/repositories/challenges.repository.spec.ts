import { Test, TestingModule } from '@nestjs/testing';
import { ChallengesRepository } from './challenges.repository';
import { PrismaService } from '../../database/prisma.service';

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
            challenges: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
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

    repository = module.get<ChallengesRepository>(ChallengesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create challenge with progress for all users', async () => {
      const dto = {
        title: 'Test',
        description: 'Desc',
        available: true,
        startDate: new Date(),
        endDate: new Date(),
      };
      const mockChallenge = { id: 'c1', ...dto, challengeProgresses: [] };

      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'u1' },
        { id: 'u2' },
      ]);
      (prisma.challenges.create as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await repository.create(dto);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
      expect(prisma.challenges.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          challengeProgresses: {
            create: [
              { userId: 'u1', progress: 0, completed: false },
              { userId: 'u2', progress: 0, completed: false },
            ],
          },
        },
        include: { challengeProgresses: true },
      });
      expect(result).toBe(mockChallenge);
    });
  });

  describe('findAll', () => {
    it('should return all challenges with progress', async () => {
      const mockChallenges = [{ id: 'c1', challengeProgresses: [] }];
      (prisma.challenges.findMany as jest.Mock).mockResolvedValue(
        mockChallenges,
      );

      const result = await repository.findAll();

      expect(prisma.challenges.findMany).toHaveBeenCalledWith({
        include: { challengeProgresses: true },
      });
      expect(result).toBe(mockChallenges);
    });
  });

  describe('findById', () => {
    it('should return challenge by id with progress', async () => {
      const mockChallenge = { id: 'c1', challengeProgresses: [] };
      (prisma.challenges.findUnique as jest.Mock).mockResolvedValue(
        mockChallenge,
      );

      const result = await repository.findById('c1');

      expect(prisma.challenges.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        include: { challengeProgresses: true },
      });
      expect(result).toBe(mockChallenge);
    });

    it('should return null if challenge not found', async () => {
      (prisma.challenges.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update challenge', async () => {
      const updateDto = { available: false };
      const mockChallenge = { id: 'c1', available: false };
      (prisma.challenges.update as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await repository.update('c1', updateDto);

      expect(prisma.challenges.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { ...updateDto },
      });
      expect(result).toBe(mockChallenge);
    });
  });

  describe('delete', () => {
    it('should delete challenge', async () => {
      const mockChallenge = { id: 'c1' };
      (prisma.challenges.delete as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await repository.delete('c1');

      expect(prisma.challenges.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(result).toBe(mockChallenge);
    });
  });
});
