import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsApiModule } from '../events/events-api.module';
import { FoodyModule } from '../foody/foody.module';
import { MissionsModule } from '../missions/missions.module';
import { SurveysModule } from '../surveys/surveys.module';
import { GamificationModule } from '../gamification/gamification.module';
import { LearningModule } from '../learning/learning.module';
import { QuestsModule } from '../quests/quests.module';

@Module({
  imports: [
    EventsApiModule,
    BadgesModule,
    ChallengesModule,
    MissionsModule,
    SurveysModule,
    GamificationModule,
    FoodyModule,
    LearningModule,
    QuestsModule,
  ],
})
export class EngagementModule {}
