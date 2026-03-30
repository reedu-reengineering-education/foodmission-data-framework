import { Module } from '@nestjs/common';
import { ShelfLifeService } from './services/shelf-life.service';
import { FoodShelfLifeRepository } from './repositories/food-shelf-life.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ShelfLifeService, FoodShelfLifeRepository],
  exports: [ShelfLifeService, FoodShelfLifeRepository],
})
export class ShelfLifeModule {}
