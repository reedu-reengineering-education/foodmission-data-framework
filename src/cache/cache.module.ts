import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheEvictInterceptor } from './cache-evict.interceptor';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );

        return {
          stores: [new Keyv(new KeyvRedis(redisUrl))],
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    ConfigModule,
  ],
  providers: [CacheService, CacheInterceptor, CacheEvictInterceptor],
  exports: [
    CacheService,
    NestCacheModule,
    CacheInterceptor,
    CacheEvictInterceptor,
  ],
})
export class CacheModule {}
