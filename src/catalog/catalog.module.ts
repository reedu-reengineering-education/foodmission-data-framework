import { Module } from '@nestjs/common';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { UsersRepository } from '../users/repositories/users.repository';

@Module({
  imports: [CommonModule, DatabaseModule, UsersModule],
  controllers: [CatalogController],
  providers: [CatalogService, UsersRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
