import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { JWTService } from '../services/jwt.service';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    avatar: string | null;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'No token provided',
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    // Verify JWT first
    const decoded = JWTService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid token!',
        error: 'Unauthorized',
      });
    }

    // Check token in Redis or Database
    const userId = await JWTService.verifyTokenInRedis(token);
    if (!userId || userId !== decoded.id) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid token!',
        error: 'Unauthorized',
      });
    }

    // Get user
    const user = await UsersService.findById(userId);
    req.user = user as any;

    next();
  } catch (error) {
    return res.status(401).json({
      statusCode: 401,
      message: 'Invalid token!',
      error: 'Unauthorized',
    });
  }
};

