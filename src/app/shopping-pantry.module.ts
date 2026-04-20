import { Module } from '@nestjs/common';
import { PantryModule } from '../pantry/pantry.module';
import { ShelfLifeModule } from '../shelf-life/shelf-life.module';
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';

@Module({
  imports: [ShoppingListsModule, PantryModule, ShelfLifeModule],
})
export class ShoppingPantryModule {}
