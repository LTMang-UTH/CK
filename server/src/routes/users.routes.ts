import { Router, Response } from 'express';
import { UsersService } from '../services/users.service';
import { AuthRequest, authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Most routes require authentication
router.use((req, res, next) => {
  // Skip auth for reset-password and reset-otp
  if (req.path === '/reset-password' || req.path === '/reset-otp') {
    return next();
  }
  return authMiddleware(req, res, next);
});

router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await UsersService.getProfile(userId);

    return res.status(200).json({
      statusCode: 200,
      data: user,
    });
  } catch (error: any) {
    return res.status(400).json({
      statusCode: 400,
      message: error.message || 'Failed to get profile',
      error: 'Bad Request',
    });
  }
});

router.post('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    const { password, confirm_password } = req.body;

    if (!password || !confirm_password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Password and confirm_password are required',
        error: 'Bad Request',
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Password not match',
        error: 'Bad Request',
      });
    }

    const userId = req.user!.id;
    const { accessToken } = await UsersService.changePassword(userId, password);

    return res.status(200).json({
      statusCode: 200,
      message: 'Password change successful',
      data: {
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      statusCode: 400,
      message: error.message || 'Failed to change password',
      error: 'Bad Request',
    });
  }
});

// Reset password routes don't require authentication
router.post('/reset-password', async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email is required',
        error: 'Bad Request',
      });
    }

    await UsersService.resetPassword(email);

    return res.status(200).json({
      statusCode: 200,
      message: 'Successfully sent reset password email, please check your email',
    });
  } catch (error: any) {
    const statusCode = error.message.includes('after') ? 429 : 400;
    return res.status(statusCode).json({
      statusCode,
      message: error.message || 'Failed to reset password',
      error: statusCode === 429 ? 'Too Many Requests' : 'Bad Request',
    });
  }
});

// Reset OTP route doesn't require authentication
router.post('/reset-otp', async (req, res: Response) => {
  try {
    const { email, otp, password, confirm_password } = req.body;

    if (!email || !otp || !password || !confirm_password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'All fields are required',
        error: 'Bad Request',
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Password not match',
        error: 'Bad Request',
      });
    }

    await UsersService.resetOTP(email, otp, password);

    return res.status(200).json({
      statusCode: 200,
      message: 'Successfully changed password. Please login with new password',
    });
  } catch (error: any) {
    return res.status(400).json({
      statusCode: 400,
      message: error.message || 'Failed to reset password',
      error: 'Bad Request',
    });
  }
});

export default router;

