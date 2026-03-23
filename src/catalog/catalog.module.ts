import { Module } from '@nestjs/common';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  imports: [CommonModule, DatabaseModule, UserModule],
  controllers: [CatalogController],
  providers: [CatalogService, UserRepository],
  exports: [CatalogService],
})
export class CatalogModule {}
