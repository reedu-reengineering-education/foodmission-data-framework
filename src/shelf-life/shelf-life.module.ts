import { Module } from '@nestjs/common';
import { ShelfLifeService } from './services/shelf-life.service';
import { ShelfLifeRepository } from './repositories/shelf-life.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ShelfLifeService, ShelfLifeRepository],
  exports: [ShelfLifeService, ShelfLifeRepository],
})
export class ShelfLifeModule {}
