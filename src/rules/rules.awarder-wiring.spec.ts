import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OffMongoPrismaService } from '../database/off-mongo-prisma.service';
import { PrismaService } from '../database/prisma.service';
import { GamificationModule } from '../gamification/gamification.module';
import { COMPLETION_REWARD_AWARDER } from '../gamification/completion-reward.types';
import { CompletionRewardService } from '../gamification/services/completion-reward.service';
import { RulesModule } from './rules.module';
import { RulesService } from './rules.service';

/**
 * The rules -> gamification -> events -> rules dependency is cyclic, and
 * RulesService resolves the awarder lazily through ModuleRef to avoid declaring
 * that cycle at module level. Nothing fails at boot if that lookup is wrong, so
 * check it here rather than discovering it the first time a rule completes one.
 */
describe('RulesService awarder wiring', () => {
  it('resolves the completion reward awarder across modules at runtime', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RulesModule,
        GamificationModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(OffMongoPrismaService)
      .useValue({})
      .compile();

    const rules = moduleRef.get(RulesService);
    const resolved = (
      rules as unknown as { getAwarder(): unknown }
    ).getAwarder();

    expect(resolved).toBe(moduleRef.get(CompletionRewardService));
    expect(resolved).toBe(moduleRef.get(COMPLETION_REWARD_AWARDER));
  });
});
