import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { ChallengeController } from './controllers/challenge.controller';
import { ChallengeService } from './services/challenge.service';
import { ChallengeRepository } from './repositories/challenge.repository';  

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule, ChallengeModule],
  controllers: [ChallengeController],
  providers: [ChallengeService, ChallengeRepository, UserRepository],
  exports: [ChallengeService, ChallengeRepository],
})
export class ChallengeModule {}
