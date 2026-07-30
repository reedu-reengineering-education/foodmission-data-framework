import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MissionsModule } from '../missions/missions.module';
import { SurveysModule } from '../surveys/surveys.module';
import { GamificationModule } from '../gamification/gamification.module';
import { ConsentsModule } from '../consents/consents.module';

@Module({
  imports: [
    ChallengesModule,
    MissionsModule,
    KnowledgeModule,
    SurveysModule,
    GamificationModule,
    ConsentsModule,
  ],
})
export class EngagementModule {}
