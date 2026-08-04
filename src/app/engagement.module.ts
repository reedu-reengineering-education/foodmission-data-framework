import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsApiModule } from '../events/events-api.module';
import { MissionsModule } from '../missions/missions.module';
import { SurveysModule } from '../surveys/surveys.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    EventsApiModule,
    ChallengesModule,
    MissionsModule,
    SurveysModule,
    GamificationModule,
  ],
})
export class EngagementModule {}
