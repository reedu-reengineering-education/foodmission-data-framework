import { Module } from '@nestjs/common';
import { SurveysController } from './controllers/surveys.controller';
import { SurveysService } from './services/surveys.service';
import { SurveysRepository } from './repositories/surveys.repository';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [SurveysController],
  providers: [SurveysService, SurveysRepository],
  exports: [SurveysService],
})
export class SurveysModule {}
