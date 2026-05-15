import { Module } from '@nestjs/common';
import { CatalogModule as AppCatalogModule } from '../catalog/catalog.module';
import { FoodProductsModule } from '../food-products/food-products.module';
import { GenericFoodsModule } from '../generic-foods/generic-foods.module';

@Module({
  imports: [FoodProductsModule, GenericFoodsModule, AppCatalogModule],
})
export class CatalogFeatureModule {}
