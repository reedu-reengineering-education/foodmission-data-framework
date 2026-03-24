import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MissionsModule } from '../missions/missions.module';

/**
 * Challenges, missions, and knowledge/quiz content.
 */
@Module({
  imports: [ChallengesModule, MissionsModule, KnowledgeModule],
})
export class EngagementModule {}
