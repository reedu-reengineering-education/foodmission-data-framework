import { Global, Module } from '@nestjs/common';
import { AfterCommitModule } from '../common/after-commit/after-commit.module';
import { DatabaseModule } from '../database/database.module';
import { RulesService } from './rules.service';
import { RulesDeadlineScheduler } from './rules-deadline.scheduler';

@Global()
@Module({
  imports: [DatabaseModule, AfterCommitModule],
  providers: [RulesService, RulesDeadlineScheduler],
  exports: [RulesService],
})
export class RulesModule {}
