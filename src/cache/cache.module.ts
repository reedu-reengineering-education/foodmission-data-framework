import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import KeyvRedis = require('@keyv/redis');
import Keyv = require('keyv');
const { CacheableMemory } = require('cacheable');

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');

        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new Keyv({
              store: new KeyvRedis(redisUrl),
            }),
          ],
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    ConfigModule,
  ],
  providers: [CacheService, CacheInvalidationService],
  exports: [CacheService, CacheInvalidationService, NestCacheModule],
})
export class CacheModule {}