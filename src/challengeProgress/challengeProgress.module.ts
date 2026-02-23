import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { ChallengeProgressController } from './controllers/challengeProgresscontroller';
import { ChallengeProgressService } from './services/challengeProgress.service';
import { ChallengeProgressRepository } from './repositories/challengeProgress.repository';  
import { ChallengeRepository } from 'src/challenge/repositories/challenge.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule, ChallengeProgressModule],
  controllers: [ChallengeProgressController],
  providers: [ChallengeProgressService, ChallengeProgressRepository, UserRepository, ChallengeRepository],
  exports: [ChallengeProgressService, ChallengeProgressRepository],
})
export class ChallengeProgressModule {}
