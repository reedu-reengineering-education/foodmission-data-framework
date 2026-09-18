import { Global, Module } from '@nestjs/common';
import { AfterCommitModule } from '../common/after-commit/after-commit.module';
import { DatabaseModule } from '../database/database.module';
import { RulesService } from './rules.service';

@Global()
@Module({
  imports: [DatabaseModule, AfterCommitModule],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
