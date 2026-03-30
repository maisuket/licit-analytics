import { Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      // isGlobal: true injeta o CACHE_MANAGER nativo globalmente de forma automática e dinâmica
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          url:
            configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          ttl: 86400000, // 24 horas em milissegundos
        });

        return {
          // O cast para 'any' (ou unknown as CacheStore) é necessário na v5 do cache-manager
          // para compatibilidade com a interface interna do NestJS
          store: store as any,
        };
      },
    }),
  ],
  providers: [CacheService],
  // A CORREÇÃO: Removemos o NestCacheModule estático daqui.
  // Exportamos apenas o nosso CacheService.
  exports: [CacheService],
})
export class CacheModule {}
