import { Test, TestingModule } from '@nestjs/testing';
import { MissionsService } from './missions.service';
import { MissionsRepository } from '../repositories/missions.repository';
import { PrismaService } from '../../database/prisma.service';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { QuestsService } from '../../quests/services/quests.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('MissionsService', () => {
  let service: MissionsService;
  let repository: MissionsRepository;
  let gamificationI18n: GamificationI18nService;

  const mockMission = {
    id: 'm1',
    slug: 'plastic-free-month',
    title: 'Test Mission',
    description: 'Test Description',
    available: true,
    startDate: new Date(),
    endDate: new Date(),
    missionProgresses: [{ userId: 'u1', progress: 50 }],
  };

  const mockGamificationI18n = {
    getMissionCopy: jest.fn((_slug, fallbacks) => fallbacks),
    getMissionCopyOrThrow: jest.fn(() => ({
      title: 'Plastic-Free Month',
      description: 'Eliminate single-use plastics from your life for 30 days',
    })),
    getChallengeCopy: jest.fn(),
    getChallengeCopyOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        {
          provide: MissionsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: GamificationI18nService,
          useValue: mockGamificationI18n,
        },
        {
          provide: QuestsService,
          useValue: {
            transformToResponseDto: jest.fn((quest) => ({
              id: quest.id,
              slug: quest.slug,
              title: quest.title,
            })),
          },
        },
      ],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
    repository = module.get<MissionsRepository>(MissionsRepository);
    gamificationI18n = module.get<GamificationI18nService>(
      GamificationI18nService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      slug: 'plastic-free-month',
      available: true,
      startDate: new Date(),
      endDate: new Date(),
    };

    it('should call repository.create and return transformed result', async () => {
      (repository.create as jest.Mock).mockResolvedValue(mockMission);
      const result = await service.create(createDto);
      expect(gamificationI18n.getMissionCopyOrThrow).toHaveBeenCalledWith(
        'plastic-free-month',
      );
      expect(repository.create).toHaveBeenCalledWith({
        slug: 'plastic-free-month',
        title: 'Plastic-Free Month',
        description: 'Eliminate single-use plastics from your life for 30 days',
        available: createDto.available,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
      });
      expect(result).toMatchObject({
        id: 'm1',
        slug: 'plastic-free-month',
        title: 'Test Mission',
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

    it('should throw BadRequestException for unexpected errors', async () => {
      (repository.create as jest.Mock).mockRejectedValue(
        new Error('Unexpected'),
      );
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMissionById', () => {
    it('should return mission if found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(mockMission);
      const result = await service.getMissionById('m1');
      expect(repository.findById).toHaveBeenCalledWith('m1');
      expect(result).toMatchObject({
        id: 'm1',
        slug: 'plastic-free-month',
        title: 'Test Mission',
      });
    });

    it('should throw NotFoundException if mission not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.getMissionById('m1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { available: true };

    it('should call repository.update and return transformed result', async () => {
      (repository.update as jest.Mock).mockResolvedValue(mockMission);
      const result = await service.update('m1', updateDto);
      expect(repository.update).toHaveBeenCalledWith('m1', updateDto);
      expect(result).toMatchObject({ id: 'm1', available: true });
    });

    it('should rethrow ConflictException', async () => {
      (repository.update as jest.Mock).mockRejectedValue(
        new ConflictException('Conflict'),
      );
      await expect(service.update('m1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rethrow BadRequestException', async () => {
      (repository.update as jest.Mock).mockRejectedValue(
        new BadRequestException('Bad Request'),
      );
      await expect(service.update('m1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow NotFoundException', async () => {
      (repository.update as jest.Mock).mockRejectedValue(
        new NotFoundException('Not Found'),
      );
      await expect(service.update('m1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rethrow ForbiddenException', async () => {
      (repository.update as jest.Mock).mockRejectedValue(
        new ForbiddenException('Forbidden'),
      );
      await expect(service.update('m1', updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle PrismaClientKnownRequestError', async () => {
      const prismaError = new PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      (repository.update as jest.Mock).mockRejectedValue(prismaError);
      await expect(service.update('m1', updateDto)).rejects.toThrow();
    });

    it('should throw BadRequestException for unexpected errors', async () => {
      (repository.update as jest.Mock).mockRejectedValue(
        new Error('Unexpected'),
      );
      await expect(service.update('m1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllMissions', () => {
    it('passes lang to gamification i18n lookup', async () => {
      (repository.findAll as jest.Mock).mockResolvedValue([mockMission]);

      await service.getAllMissions('de');

      expect(gamificationI18n.getMissionCopy).toHaveBeenCalledWith(
        'plastic-free-month',
        {
          title: 'Test Mission',
          description: 'Test Description',
        },
        'de',
      );
    });
  });

  describe('remove', () => {
    it('should call repository.delete', async () => {
      (repository.delete as jest.Mock).mockResolvedValue(undefined);
      await service.remove('m1');
      expect(repository.delete).toHaveBeenCalledWith('m1');
    });

    it('should throw BadRequestException on error', async () => {
      (repository.delete as jest.Mock).mockRejectedValue(new Error('DB Error'));
      await expect(service.remove('m1')).rejects.toThrow(BadRequestException);
    });
  });
});
