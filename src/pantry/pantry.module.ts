import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { PantryService } from './services/pantry.service';
import { PantryRepository } from './repositories/pantry.repository';
import { PantryController } from './controllers/pantry.controller';
@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [PantryController],
  providers: [PantryService, PantryRepository, UserRepository],
  exports: [PantryService, PantryRepository],
})
export class PantryModule {}
