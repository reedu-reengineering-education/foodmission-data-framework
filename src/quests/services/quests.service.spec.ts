import { Test, TestingModule } from '@nestjs/testing';
import { QuestsService } from './quests.service';
import { QuestsRepository } from '../repositories/quests.repository';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { NotFoundException } from '@nestjs/common';
import { ProgressTrackingType } from '@prisma/client';

describe('QuestsService', () => {
  let service: QuestsService;
  let repository: QuestsRepository;

  const mockQuest = {
    id: 'q1',
    slug: 'avoid-single-use-plastic',
    missionId: 'm1',
    title: 'Avoid single-use plastic',
    description: 'Skip disposable plastic items in your daily routine',
    sortOrder: 0,
    available: true,
    streakEnabled: true,
    progressTrackingType: ProgressTrackingType.SOFT,
    topicSlug: 'plastic-waste',
    challenges: [],
  };

  const mockGamificationI18n = {
    getQuestCopy: jest.fn((_slug, fallbacks) => fallbacks),
    getQuestCopyOrThrow: jest.fn(() => ({
      title: 'Avoid single-use plastic',
      description: 'Skip disposable plastic items in your daily routine',
    })),
    getChallengeCopy: jest.fn((_slug, fallbacks) => fallbacks),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        {
          provide: QuestsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByMissionId: jest.fn(),
            findAll: jest.fn(),
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

    service = module.get<QuestsService>(QuestsService);
    repository = module.get<QuestsRepository>(QuestsRepository);
  });

  it('should return quests filtered by mission', async () => {
    (repository.findByMissionId as jest.Mock).mockResolvedValue([mockQuest]);

    const result = await service.getQuests('m1');

    expect(repository.findByMissionId).toHaveBeenCalledWith('m1');
    expect(result[0]).toMatchObject({
      id: 'q1',
      slug: 'avoid-single-use-plastic',
      streakEnabled: true,
    });
  });

  it('should throw when quest is missing', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    await expect(service.getQuestById('q1')).rejects.toThrow(NotFoundException);
  });
});
