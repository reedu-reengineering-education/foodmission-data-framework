import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MissionsModule } from '../missions/missions.module';
import { SurveysModule } from '../surveys/surveys.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    ChallengesModule,
    MissionsModule,
    KnowledgeModule,
    SurveysModule,
    GamificationModule,
  ],
})
export class EngagementModule {}
