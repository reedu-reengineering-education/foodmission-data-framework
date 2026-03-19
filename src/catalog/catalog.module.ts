import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [CatalogController],
  providers: [CatalogService, UserRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
