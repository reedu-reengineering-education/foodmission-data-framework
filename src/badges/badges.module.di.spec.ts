import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../database/prisma.service';
import { BadgesModule } from './badges.module';
import { BadgeRulesService } from './badge-rules.service';
import { BADGE_RULE_EVALUATOR } from './badge-rules.types';
import { BadgesService } from './services/badges.service';

/**
 * Guards the wiring, not the behaviour: BadgeRulesService depends on two
 * tokens from other modules (USER_EVENT_RECORDER, COMPLETION_REWARD_AWARDER)
 * and the cycle it sits in is only safe because those are resolved the way
 * this module arranges. A broken graph fails at boot, which no unit test of
 * the service itself would catch.
 */
describe('BadgesModule wiring', () => {
  it('resolves the evaluator and its cross-module dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // The controller guards on ThrottlerGuard, like every other one here.
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        BadgesModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(BadgesService)).toBeInstanceOf(BadgesService);
    expect(moduleRef.get(BadgeRulesService)).toBeInstanceOf(BadgeRulesService);
    expect(moduleRef.get(BADGE_RULE_EVALUATOR)).toBe(
      moduleRef.get(BadgeRulesService),
    );
  });
});
