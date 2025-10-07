import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggingService } from './logging/logging.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { validateEnvironment } from '../security/config/environment.validation';
import { UserModule } from '../user/user.module';
import { DataBaseAuthGuard } from './guards/auth.guards';

@Global()
@Module({
  imports: [
    UserModule,
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
    LoggingService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [LoggingService, ConfigModule, DataBaseAuthGuard],
})
export class CommonModule {}
