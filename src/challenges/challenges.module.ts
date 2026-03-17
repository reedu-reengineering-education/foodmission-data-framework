import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { ChallengesController } from './controllers/challenges.controller';
import { ChallengesService } from './services/challenges.service';
import { ChallengesRepository } from './repositories/challenges.repository';
import { ChallengeProgressController } from './challenge-progress/controllers/challenge-progress.controller';
import { ChallengeProgressService } from './challenge-progress/services/challenge-progress.service';
import { ChallengeProgressRepository } from './challenge-progress/repositories/challenge-progress.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [ChallengesController, ChallengeProgressController],
  providers: [
    ChallengesService,
    ChallengesRepository,
    ChallengeProgressService,
    ChallengeProgressRepository,
    UserRepository,
  ],
  exports: [ChallengesService, ChallengesRepository, ChallengeProgressService, ChallengeProgressRepository],
})
export class ChallengesModule {}
