import { Module } from '@nestjs/common';
import { PantryModule } from '../pantry/pantry.module';
import { ShoppingListsModule } from '../shopping-lists/shopping-lists.module';
import { FoodWasteModule } from '../foodWaste/food-waste.module';

@Module({
  imports: [ShoppingListsModule, PantryModule, FoodWasteModule],
})
export class ShoppingPantryModule {}
