import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value || null;
    } catch (error) {
      this.logger.error(`Erro ao obter cache: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = 86400000): Promise<void> {
    try {
      // O BullMQ e o CacheManager usam milissegundos por padrão nas versões atuais
      await this.cacheManager.set(key, value, ttlMs);
    } catch (error) {
      this.logger.error(`Erro ao definir cache: ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
