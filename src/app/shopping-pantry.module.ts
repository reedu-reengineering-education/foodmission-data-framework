import { Module } from '@nestjs/common';
import { PantryModule } from '../pantry/pantry.module';
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';

@Module({
  imports: [ShoppingListsModule, PantryModule],
})
export class ShoppingPantryModule {}
