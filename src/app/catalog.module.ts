import { Module } from '@nestjs/common';
import { CatalogModule as AppCatalogModule } from '../catalog/catalog.module';
import { FoodsModule } from '../foods/foods.module';
import { FoodCategoriesModule } from '../foodCategories/food-categories.module';

@Module({
  imports: [FoodsModule, FoodCategoriesModule, AppCatalogModule],
})
export class CatalogFeatureModule {}
