import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { ChallengesController } from './controllers/challenges.controller';
import { ChallengesService } from './services/challenges.service';
import { ChallengesRepository } from './repositories/challenges.repository';
import { ChallengeProgressController } from './controllers/challenge-progress.controller';
import { ChallengeProgressService } from './services/challenge-progress.service';
import { ChallengeProgressRepository } from './repositories/challenge-progress.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [ChallengesController, ChallengeProgressController],
  providers: [
    ChallengesService,
    ChallengesRepository,
    ChallengeProgressService,
    ChallengeProgressRepository,
    UsersRepository,
  ],
  exports: [
    ChallengesService,
    ChallengesRepository,
    ChallengeProgressService,
    ChallengeProgressRepository,
  ],
})
export class ChallengesModule {}
