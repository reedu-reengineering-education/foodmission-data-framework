import { Module } from '@nestjs/common';
import { MealsController } from './controllers/meals.controller';
import { MealsService } from './services/meals.service';
import { MealsRepository } from './repositories/meals.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [MealsController],
  providers: [MealsService, MealsRepository, UsersRepository],
  exports: [MealsService, MealsRepository],
})
export class MealsModule {}
