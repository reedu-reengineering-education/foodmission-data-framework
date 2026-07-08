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
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { I18nJsonLoader, I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import { DEFAULT_LOCALE } from './i18n/constants';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: DEFAULT_LOCALE,
      loader: I18nJsonLoader,
      loaderOptions: {
        path: join(__dirname, 'i18n/'),
        watch: !['production', 'test'].includes(process.env.NODE_ENV ?? ''),
      },
      resolvers: [
        {
          use: QueryResolver,
          options: ['lang'],
        },
      ],
    }),
    InfrastructureModule,
    LoggingModule,
    MonitoringModule,
    AnalyticsModule,
    SecurityModule,
    UserCommunityModule,
    CatalogFeatureModule,
    ShoppingPantryModule,
    MealRecipeModule,
    EngagementModule,
    WebhooksModule,
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
