import { Global, Module } from '@nestjs/common';
import { GamificationI18nService } from './gamification-i18n.service';
import { KnowledgeI18nService } from './knowledge-i18n.service';

@Global()
@Module({
  providers: [GamificationI18nService, KnowledgeI18nService],
  exports: [GamificationI18nService, KnowledgeI18nService],
})
export class I18nSupportModule {}
