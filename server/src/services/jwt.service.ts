import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import RedisService from './redis.service';
import { prisma } from './prisma.service';

export class JWTService {
  static async setAccessToken(userId: string): Promise<string> {
    const accessToken = jwt.sign(
      { id: userId },
      config.accessTokenSecret,
      { expiresIn: '3d' }
    );

    // Update token in database
    await prisma.users.update({
      where: { id: userId },
      data: { accessToken },
    });

    // Store in Redis with 15 minutes TTL (900 seconds) if available
    await RedisService.set(`accessToken:${accessToken}`, userId, 'EX', 900);

    return accessToken;
  }

  static async clearOldTokens(userId: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user || !user.accessToken) return false;

    // Remove from Redis if available
    await RedisService.del(`accessToken:${user.accessToken}`);

    return true;
  }

  static async verifyTokenInRedis(token: string): Promise<string | null> {
    // Try Redis first
    const userId = await RedisService.get(`accessToken:${token}`);
    if (userId) {
      return userId;
    }

    // Fallback to database
    const user = await prisma.users.findFirst({
      where: { accessToken: token },
      select: { id: true },
    });

    return user?.id || null;
  }

  static verifyToken(token: string): { id: string } | null {
    try {
      const decoded = jwt.verify(token, config.accessTokenSecret) as { id: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

