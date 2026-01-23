import Redis from 'ioredis';
import { config } from '../config/env';

class RedisService {
  private static instance: Redis | null = null;
  private static isConnected: boolean = false;
  private static isEnabled: boolean = true;

  static getInstance(): Redis | null {
    if (!RedisService.isEnabled) {
      return null;
    }

    if (!RedisService.instance) {
      try {
        RedisService.instance = new Redis(config.redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              console.warn('⚠️  Redis connection failed, falling back to database');
              RedisService.isEnabled = false;
              return null; // Stop retrying
            }
            return Math.min(times * 50, 2000);
          },
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });
        
        RedisService.instance.on('connect', () => {
          console.log('✅ Redis connected');
          RedisService.isConnected = true;
        });

        RedisService.instance.on('ready', () => {
          RedisService.isConnected = true;
        });

        RedisService.instance.on('error', (err) => {
          if (RedisService.isConnected) {
            console.error('❌ Redis error:', err.message);
          }
          RedisService.isConnected = false;
        });

        RedisService.instance.on('close', () => {
          RedisService.isConnected = false;
        });
      } catch (error) {
        console.warn('⚠️  Redis initialization failed, falling back to database');
        RedisService.isEnabled = false;
        return null;
      }
    }
    return RedisService.instance;
  }

  static async isAvailable(): Promise<boolean> {
    if (!RedisService.isEnabled || !RedisService.instance) {
      return false;
    }
    try {
      const result = await RedisService.instance.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  static async get(key: string): Promise<string | null> {
    if (!(await RedisService.isAvailable())) {
      return null;
    }
    try {
      return await RedisService.instance!.get(key);
    } catch {
      return null;
    }
  }

  static async set(key: string, value: string, expiry?: string, seconds?: number): Promise<boolean> {
    if (!(await RedisService.isAvailable())) {
      return false;
    }
    try {
      if (expiry && seconds) {
        await RedisService.instance!.set(key, value, expiry, seconds);
      } else {
        await RedisService.instance!.set(key, value);
      }
      return true;
    } catch {
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    if (!(await RedisService.isAvailable())) {
      return false;
    }
    try {
      await RedisService.instance!.del(key);
      return true;
    } catch {
      return false;
    }
  }

  static async ttl(key: string): Promise<number> {
    if (!(await RedisService.isAvailable())) {
      return -1;
    }
    try {
      return await RedisService.instance!.ttl(key);
    } catch {
      return -1;
    }
  }

  static async disconnect() {
    if (RedisService.instance) {
      try {
        await RedisService.instance.quit();
        console.log('❌ Redis disconnected');
      } catch (error) {
        // Ignore disconnect errors
      }
      RedisService.instance = null;
      RedisService.isConnected = false;
    }
  }
}

export const redis = RedisService.getInstance();
export default RedisService;

