import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Username and password are required',
        error: 'Bad Request',
      });
    }

    const { user, accessToken } = await AuthService.login(username, password);

    return res.status(200).json({
      statusCode: 200,
      message: 'Login successful',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      statusCode: 400,
      message: error.message || 'Login failed',
      error: 'Bad Request',
    });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, confirm_password, email } = req.body;

    if (!username || !password || !confirm_password || !email) {
      return res.status(400).json({
        statusCode: 400,
        message: 'All fields are required',
        error: 'Bad Request',
      });
    }

    const { user, accessToken } = await AuthService.register(
      username,
      password,
      confirm_password,
      email
    );

    return res.status(201).json({
      statusCode: 201,
      message: 'Register successful',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      statusCode: 400,
      message: error.message || 'Registration failed',
      error: 'Bad Request',
    });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
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

    // Verify JWT and get userId from Redis or Database
    const { JWTService } = require('../services/jwt.service');
    const decoded = JWTService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid token!',
        error: 'Unauthorized',
      });
    }

    const userId = await JWTService.verifyTokenInRedis(token);
    if (!userId || userId !== decoded.id) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid token!',
        error: 'Unauthorized',
      });
    }

    await AuthService.logout(userId);

    return res.status(200).json({
      statusCode: 200,
      message: 'Logout successful',
    });
  } catch (error: any) {
    return res.status(400).json({
      statusCode: 400,
      message: error.message || 'Logout failed',
      error: 'Bad Request',
    });
  }
});

export default router;

