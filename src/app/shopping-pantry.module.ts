import { Module } from '@nestjs/common';
import { PantriesModule } from '../pantries/pantries.module';
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';

@Module({
  imports: [ShoppingListsModule, PantriesModule],
})
export class ShoppingPantryModule {}
