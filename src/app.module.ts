import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogFeatureModule } from './app/catalog.module';
import { EngagementModule } from './app/engagement.module';
import { InfrastructureModule } from './app/infrastructure.module';
import { MealRecipeModule } from './app/meal-recipe.module';
import { ShoppingPantryModule } from './app/shopping-pantry.module';
import { UserCommunityModule } from './app/user-community.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { LoggingModule } from './common/logging/logging.module';
import { MonitoringMiddleware } from './monitoring/monitoring.middleware';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SecurityMiddleware } from './security/middleware/security.middleware';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    InfrastructureModule,
    LoggingModule,
    MonitoringModule,
    SecurityModule,
    UserCommunityModule,
    CatalogFeatureModule,
    ShoppingPantryModule,
    MealRecipeModule,
    EngagementModule,
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
