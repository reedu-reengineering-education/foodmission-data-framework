import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecurityService } from './security.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SecurityMiddleware } from './middleware/security.middleware';
import { InputSanitizationPipe } from './pipes/input-sanitization.pipe';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1 second
            limit: 10, // 10 requests per second
          },
          {
            name: 'medium',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute
          },
          {
            name: 'long',
            ttl: 900000, // 15 minutes
            limit: 1000, // 1000 requests per 15 minutes
          },
        ],
        skipIf: () => {
          // Skip rate limiting in test environment
          return process.env.NODE_ENV === 'test';
        },
      }),
    }),
  ],
  providers: [
    SecurityService,
    RateLimitGuard,
    SecurityMiddleware,
    InputSanitizationPipe,
  ],
  exports: [
    SecurityService,
    RateLimitGuard,
    SecurityMiddleware,
    InputSanitizationPipe,
    ThrottlerModule,
  ],
})
export class SecurityModule {}