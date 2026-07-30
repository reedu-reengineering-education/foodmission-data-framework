import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsApiModule } from '../events/events-api.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MissionsModule } from '../missions/missions.module';
import { SurveysModule } from '../surveys/surveys.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    EventsApiModule,
    ChallengesModule,
    MissionsModule,
    KnowledgeModule,
    SurveysModule,
    GamificationModule,
  ],
})
export class EngagementModule {}
