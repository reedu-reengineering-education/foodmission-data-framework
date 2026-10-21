import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule } from './logging/logging.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { validateEnvironment } from '../security/config/environment.validation';
import { UsersModule } from '../users/users.module';
import { DataBaseAuthGuard } from './guards/database-auth.guards';

@Global()
@Module({
  imports: [
    LoggingModule,
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [
    DataBaseAuthGuard,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [LoggingModule, ConfigModule, DataBaseAuthGuard],
})
export class CommonModule {}
