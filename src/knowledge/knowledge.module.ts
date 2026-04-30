import { Module } from '@nestjs/common';
import { KnowledgeController } from './controllers/knowledge.controller';
import { KnowledgeService } from './services/knowledge.service';
import { KnowledgeProgressService } from './services/knowledge-progress.service';
import { KnowledgeRepository } from './repositories/knowledge.repository';
import { KnowledgeProgressRepository } from './repositories/knowledge-progress.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeProgressService,
    KnowledgeRepository,
    KnowledgeProgressRepository,
    UsersRepository,
  ],
  exports: [
    KnowledgeService,
    KnowledgeProgressService,
    KnowledgeRepository,
    KnowledgeProgressRepository,
  ],
})
export class KnowledgeModule {}
