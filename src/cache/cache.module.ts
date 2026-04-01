import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheEvictInterceptor } from './cache-evict.interceptor';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheableMemory } from '@cacheable/memory';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        const stores: Keyv[] = [];
        if (redisUrl) {
          stores.push(new Keyv(new KeyvRedis(redisUrl)));
        }
        stores.push(
          new Keyv({
            store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
          }),
        );

        return { stores };
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
