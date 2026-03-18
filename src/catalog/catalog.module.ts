import { Module } from '@nestjs/common';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogService } from './services/catalog.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
