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

/**
 * Reaches past a private method to check the lazy cross-module lookup it
 * guards. Going through a function boundary (rather than an inline `as`)
 * keeps eslint's `no-unnecessary-type-assertion` from treating the cast as
 * redundant — it only sees the assertion's declared type, not tsc's
 * unrelated privacy check on direct property access.
 */
function callPrivateMethod<R>(instance: object, method: string): R {
  return (instance as unknown as Record<string, () => R>)[method]();
}

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
    const resolved = callPrivateMethod<CompletionRewardService>(
      moduleRef.get(RulesService),
      'getAwarder',
    );

    expect(resolved).toBe(moduleRef.get(CompletionRewardService));
    expect(resolved).toBe(moduleRef.get(COMPLETION_REWARD_AWARDER));
  });

  it('RulesService resolves the user event recorder', () => {
    const resolved = callPrivateMethod<UserEventService>(
      moduleRef.get(RulesService),
      'getRecorder',
    );

    expect(resolved).toBe(moduleRef.get(UserEventService));
    expect(resolved).toBe(moduleRef.get(USER_EVENT_RECORDER));
  });

  it('UserEventService resolves the quest progress recomputer', () => {
    const resolved = callPrivateMethod<QuestProgressService | null>(
      moduleRef.get(UserEventService),
      'getQuestRecomputer',
    );

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

    const resolved = callPrivateMethod<QuestProgressService | null>(
      lean.get(UserEventService),
      'getQuestRecomputer',
    );

    expect(resolved).toBeNull();
  });
});
