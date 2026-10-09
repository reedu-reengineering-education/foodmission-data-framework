import { Module } from '@nestjs/common';
import { MealLogsController } from './controllers/meal-logs.controller';
import { MealLogsService } from './services/meal-logs.service';
import { MealLogsRepository } from './repositories/meal-logs.repository';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { MealsModule } from '../meals/meals.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { MealItemRepository } from '../meals/meal-items/repositories/meal-items.repository';
import { OffMongoProductRepository } from '../food-products/repositories/off-mongo-product.repository';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    MealsModule,
    EventsModule,
    GamificationModule,
  ],
  controllers: [MealLogsController],
  providers: [
    MealLogsService,
    MealLogsRepository,
    UsersRepository,
    MealItemRepository,
    OffMongoProductRepository,
  ],
  exports: [MealLogsService, MealLogsRepository],
})
export class MealLogsModule {}
