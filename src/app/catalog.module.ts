import { Module } from '@nestjs/common';
import { CatalogModule as AppCatalogModule } from '../catalog/catalog.module';
import { FoodModule } from '../food/food.module';
import { FoodCategoryModule } from '../foodCategory/food-category.module';

@Module({
  imports: [FoodModule, FoodCategoryModule, AppCatalogModule],
})
export class CatalogFeatureModule {}
