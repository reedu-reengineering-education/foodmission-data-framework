import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OffMongoPrismaService } from '../database/off-mongo-prisma.service';
import { PrismaService } from '../database/prisma.service';
import { EventsModule } from '../events/events.module';
import { UserEventService } from '../events/services/user-event.service';
import { USER_EVENT_RECORDER } from '../events/user-event-recorder.types';
import { GamificationModule } from '../gamification/gamification.module';
import { COMPLETION_REWARD_AWARDER } from '../gamification/completion-reward.types';
import { CompletionRewardService } from '../gamification/services/completion-reward.service';
import { QuestProgressService } from '../quests/quest-progress.service';
import { QUEST_PROGRESS_RECOMPUTER } from '../quests/quest-progress.types';
import { QuestsModule } from '../quests/quests.module';
import { RulesModule } from './rules.module';
import { RulesService } from './rules.service';

/**
 * The rules -> gamification -> events -> rules dependency is cyclic, so
 * RulesService and UserEventService both reach across it with lazy ModuleRef
 * token lookups rather than declaring the cycle at module level. Nothing fails
 * at boot if one of those lookups is wrong — it fails the first time a real
 * completion happens. Check them here instead.
 */
describe('cross-module lazy wiring', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RulesModule,
        GamificationModule,
        EventsModule,
        QuestsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(OffMongoPrismaService)
      .useValue({})
      .compile();
  });

  it('RulesService resolves the completion reward awarder', () => {
    const resolved = (
      moduleRef.get(RulesService) as unknown as { getAwarder(): unknown }
    ).getAwarder();

    expect(resolved).toBe(moduleRef.get(CompletionRewardService));
    expect(resolved).toBe(moduleRef.get(COMPLETION_REWARD_AWARDER));
  });

  it('RulesService resolves the user event recorder', () => {
    const resolved = (
      moduleRef.get(RulesService) as unknown as { getRecorder(): unknown }
    ).getRecorder();

    expect(resolved).toBe(moduleRef.get(UserEventService));
    expect(resolved).toBe(moduleRef.get(USER_EVENT_RECORDER));
  });

  it('UserEventService resolves the quest progress recomputer', () => {
    const resolved = (
      moduleRef.get(UserEventService) as unknown as {
        getQuestRecomputer(): unknown;
      }
    ).getQuestRecomputer();

    expect(resolved).toBe(moduleRef.get(QuestProgressService));
    expect(resolved).toBe(moduleRef.get(QUEST_PROGRESS_RECOMPUTER));
  });

  it('tolerates an app that does not mount QuestsModule', async () => {
    const lean = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RulesModule,
        GamificationModule,
        EventsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(OffMongoPrismaService)
      .useValue({})
      .compile();

    const resolved = (
      lean.get(UserEventService) as unknown as {
        getQuestRecomputer(): unknown;
      }
    ).getQuestRecomputer();

    expect(resolved).toBeNull();
  });
});
