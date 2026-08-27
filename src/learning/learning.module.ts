import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { TranslationsModule } from '../translations/translations.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { LearningService } from './services/learning.service';
import { LearningTranslationHelper } from './services/learning-translation.helper';
import { DimensionsController } from './controllers/dimensions.controller';
import { FoodFactsController } from './controllers/food-facts.controller';
import { QuizzesController } from './controllers/quizzes.controller';
import { QuestsController } from './controllers/quests.controller';
import { MicroLearningsController } from './controllers/micro-learnings.controller';

@Module({
  imports: [DatabaseModule, CommonModule, TranslationsModule, GamificationModule],
  controllers: [
    DimensionsController,
    FoodFactsController,
    QuizzesController,
    QuestsController,
    MicroLearningsController,
  ],
  providers: [
    LearningService,
    LearningTranslationHelper,
    UsersRepository,
  ],
  exports: [LearningService],
})
export class LearningModule {}
