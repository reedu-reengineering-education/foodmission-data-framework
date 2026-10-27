import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { LearningService } from '../services/learning.service';
import { QuestsController } from './quests.controller';

describe('QuestsController', () => {
  let controller: QuestsController;
  const learningService = {
    upsertQuestProgress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestsController],
      providers: [{ provide: LearningService, useValue: learningService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(QuestsController);
    jest.clearAllMocks();
  });

  describe('progress override', () => {
    const targetUserId = '550e8400-e29b-41d4-a716-446655440000';

    it('writes the progress of the user named in the body', async () => {
      const dto = { userId: targetUserId, completed: true };

      await controller.upsertProgress('admin-1', 'QUEST.DIET.1', dto, {});
      await controller.upsertProgressByCode('admin-1', 'QUEST.DIET.1', dto, {});

      expect(learningService.upsertQuestProgress).toHaveBeenCalledTimes(2);
      for (const call of learningService.upsertQuestProgress.mock.calls) {
        expect(call).toEqual([targetUserId, 'QUEST.DIET.1', dto, undefined]);
      }
    });

    it('falls back to the calling admin when no user is named', async () => {
      const dto = { completed: true };

      await controller.upsertProgress('admin-1', 'QUEST.DIET.1', dto, {});

      expect(learningService.upsertQuestProgress).toHaveBeenCalledWith(
        'admin-1',
        'QUEST.DIET.1',
        dto,
        undefined,
      );
    });
  });
});
