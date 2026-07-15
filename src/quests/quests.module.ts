import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { QuestsController } from './controllers/quests.controller';
import { QuestProgressController } from './controllers/quest-progress.controller';
import { QuestsService } from './services/quests.service';
import { QuestProgressService } from './services/quest-progress.service';
import { QuestsRepository } from './repositories/quests.repository';
import { QuestProgressRepository } from './repositories/quest-progress.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [QuestsController, QuestProgressController],
  providers: [
    QuestsService,
    QuestProgressService,
    QuestsRepository,
    QuestProgressRepository,
    UsersRepository,
  ],
  exports: [
    QuestsService,
    QuestProgressService,
    QuestsRepository,
    QuestProgressRepository,
  ],
})
export class QuestsModule {}
