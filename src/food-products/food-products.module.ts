import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FoodProductController } from './controllers/food-products.controller';
import { FoodProductService } from './services/food-product.service';
import { OpenFoodFactsService } from './services/openfoodfacts.service';
import { FoodProductRepository } from './repositories/food-product.repository';
import { OffMongoProductRepository } from './repositories/off-mongo-product.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, AuthModule, HttpModule, CommonModule],
  controllers: [FoodProductController],
  providers: [
    FoodProductService,
    OpenFoodFactsService,
    FoodProductRepository,
    OffMongoProductRepository,
    UsersRepository,
  ],
  exports: [FoodProductService, OpenFoodFactsService, FoodProductRepository],
})
export class FoodProductsModule {}
