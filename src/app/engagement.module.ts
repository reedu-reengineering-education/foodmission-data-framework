import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MissionsModule } from '../missions/missions.module';
import { QuestsModule } from '../quests/quests.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [
    ChallengesModule,
    MissionsModule,
    QuestsModule,
    KnowledgeModule,
    SurveysModule,
  ],
})
export class EngagementModule {}
