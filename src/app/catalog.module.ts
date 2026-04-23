import { Module } from '@nestjs/common';
import { CatalogModule as AppCatalogModule } from '../catalog/catalog.module';
import { FoodsModule } from '../food-products/foods.module';
import { GenericFoodsModule } from '../generic-foods/generic-foods.module';

@Module({
  imports: [FoodsModule, GenericFoodsModule, AppCatalogModule],
})
export class CatalogFeatureModule {}
