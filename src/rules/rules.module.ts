import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RulesService } from './rules.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
