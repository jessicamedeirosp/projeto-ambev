import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private expireInSeconds: number
  constructor() {
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
    this.expireInSeconds = 1 * 60 // 1 minutos
  }

  async set(key: string, value: string) {
    await this.redisClient.set(key, value, 'EX', this.expireInSeconds);
  }

  async get(key: string) {
    return await this.redisClient.get(key);
  }

  async del(key: string) {
    await this.redisClient.del(key);
  }
}
