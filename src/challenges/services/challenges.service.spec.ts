import { Test, TestingModule } from '@nestjs/testing';
import { ChallengesService } from './challenges.service';
import { ChallengesRepository } from '../repositories/challenges.repository';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('ChallengesService', () => {
  let service: ChallengesService;
  let repository: ChallengesRepository;
  let gamificationI18n: GamificationI18nService;

  const mockChallenge = {
    id: 'c1',
    slug: 'bring-your-own-bag',
    title: 'Test Challenge',
    description: 'Test Description',
    available: true,
    questId: null,
    challengeScope: 'DAILY_STANDALONE',
    startDate: new Date(),
    endDate: new Date(),
    challengeProgresses: [{ userId: 'u1', progress: 50 }],
  };

  const mockGamificationI18n = {
    getChallengeCopy: jest.fn((_slug, fallbacks) => fallbacks),
    getChallengeCopyOrThrow: jest.fn(() => ({
      title: 'Bring Your Own Bag',
      description: 'Use a reusable shopping bag for your groceries today',
    })),
    getMissionCopy: jest.fn(),
    getMissionCopyOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesService,
        {
          provide: ChallengesRepository,
          useValue: {
            create: jest.fn(),
            findDailyStandalone: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: GamificationI18nService,
          useValue: mockGamificationI18n,
        },
      ],
    }).compile();

    service = module.get<ChallengesService>(ChallengesService);
    repository = module.get<ChallengesRepository>(ChallengesRepository);
    gamificationI18n = module.get<GamificationI18nService>(
      GamificationI18nService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      slug: 'bring-your-own-bag',
      available: true,
      startDate: new Date(),
      endDate: new Date(),
    };

    it('should create and return transformed challenge', async () => {
      (repository.create as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await service.create(createDto);

      expect(gamificationI18n.getChallengeCopyOrThrow).toHaveBeenCalledWith(
        'bring-your-own-bag',
      );
      expect(repository.create).toHaveBeenCalledWith({
        slug: 'bring-your-own-bag',
        title: 'Bring Your Own Bag',
        description: 'Use a reusable shopping bag for your groceries today',
        available: createDto.available,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        questId: undefined,
        challengeScope: 'DAILY_STANDALONE',
      });
      expect(result).toMatchObject({
        id: 'c1',
        slug: 'bring-your-own-bag',
        title: 'Test Challenge',
      });
    });

    it('should rethrow ConflictException', async () => {
      (repository.create as jest.Mock).mockRejectedValue(
        new ConflictException('Conflict'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rethrow BadRequestException', async () => {
      (repository.create as jest.Mock).mockRejectedValue(
        new BadRequestException('Bad Request'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle PrismaClientKnownRequestError', async () => {
      const prismaError = new PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      (repository.create as jest.Mock).mockRejectedValue(prismaError);

      await expect(service.create(createDto)).rejects.toThrow();
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      (repository.create as jest.Mock).mockRejectedValue(
        new Error('Unexpected'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getChallengeById', () => {
    it('should return challenge when found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await service.getChallengeById('c1');

      expect(repository.findById).toHaveBeenCalledWith('c1');
      expect(result).toMatchObject({
        id: 'c1',
        slug: 'bring-your-own-bag',
        title: 'Test Challenge',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getChallengeById('c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAll', () => {
    it('should return daily standalone challenges transformed', async () => {
      (repository.findDailyStandalone as jest.Mock).mockResolvedValue([
        mockChallenge,
      ]);

      const result = await service.getAll();

      expect(repository.findDailyStandalone).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'c1', slug: 'bring-your-own-bag' });
    });

    it('should return empty array when no challenges', async () => {
      (repository.findDailyStandalone as jest.Mock).mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateDto = { available: false };

    it('should update and return transformed challenge', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockChallenge);
      (repository.update as jest.Mock).mockResolvedValue({
        ...mockChallenge,
        available: false,
      });

      const result = await service.update('c1', updateDto);

      expect(repository.findById).toHaveBeenCalledWith('c1');
      expect(repository.update).toHaveBeenCalledWith('c1', updateDto);
      expect(result).toMatchObject({ id: 'c1', available: false });
    });

    it('should throw NotFoundException when challenge not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.update('c1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete challenge when found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockChallenge);
      (repository.delete as jest.Mock).mockResolvedValue(undefined);

      await service.delete('c1');

      expect(repository.findById).toHaveBeenCalledWith('c1');
      expect(repository.delete).toHaveBeenCalledWith('c1');
    });

    it('should throw NotFoundException when challenge not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('c1')).rejects.toThrow(NotFoundException);
    });
  });
});
