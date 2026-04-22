import { Module } from '@nestjs/common';
import { CatalogModule as AppCatalogModule } from '../catalog/catalog.module';
import { FoodsModule } from '../food-products/foods.module';
import { FoodCategoriesModule } from '../generic-foods/food-categories.module';

@Module({
  imports: [FoodsModule, FoodCategoriesModule, AppCatalogModule],
})
export class CatalogFeatureModule {}
