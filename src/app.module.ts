import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { FoodModule } from './food/food.module';
import { FoodCategoryModule } from './foodCategory/food-category.module';
import { UserModule } from './user/user.module';

import { HealthModule } from './health/health.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CacheModule } from './cache/cache.module';
import { SecurityModule } from './security/security.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { MonitoringMiddleware } from './monitoring/monitoring.middleware';

import { SecurityMiddleware } from './security/middleware/security.middleware';
import { ShoppingListsModule } from './shopping-lists/shopping-lists.module';
import { PantriesModule } from './pantries/pantries.module';
import { MealModule } from './meal/meal.module';
import { MealItemModule } from './mealItem/meal-item.module';
import { RecipeModule } from './recipe/recipe.module';
import { MealLogModule } from './mealLog/meal-log.module';
import { ChallengesModule } from './challenges/challenges.module';
import { MissionsModule } from './missions/missions.module';
import { UserGroupModule } from './userGroup/userGroup.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    CacheModule,
    SecurityModule,
    AuthModule,
    UserModule,
    FoodModule,
    FoodCategoryModule,
    HealthModule,
    MonitoringModule,
    ShoppingListsModule,
    PantriesModule,
    MealModule,
    MealItemModule,
    RecipeModule,
    MealLogModule,
    ChallengesModule,
    MissionsModule,
    UserGroupModule,
    KnowledgeModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, LoggingMiddleware, MonitoringMiddleware)
      .forRoutes('*');
  }
}
