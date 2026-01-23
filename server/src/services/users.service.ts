import bcrypt from 'bcrypt';
import { prisma } from './prisma.service';
import { JWTService } from './jwt.service';
import { MailService } from './mail.service';
import RedisService from './redis.service';

export class UsersService {
  static async getProfile(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    // Remove sensitive data
    const { password, accessToken, refreshToken, ...userData } = user;

    return userData;
  }

  static async findById(id: string) {
    const user = await prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng!');
    }

    // Remove password only
    const { password, ...userData } = user;

    return userData;
  }

  static async changePassword(userId: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Clear old tokens and generate new one
    await JWTService.clearOldTokens(userId);
    const accessToken = await JWTService.setAccessToken(userId);

    return { accessToken };
  }

  static async resetPassword(email: string) {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng!');
    }

    // Check if already requested (Redis or skip if Redis unavailable)
    const existingRequest = await RedisService.get(`resetPassword:${email}`);
    if (existingRequest) {
      const ttl = await RedisService.ttl(`resetPassword:${email}`);
      throw new Error(
        `You can only send another reset password request after ${ttl} seconds`
      );
    }

    // Generate OTP
    const otp = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');

    console.log(`resetPassword: Generating OTP for ${email} (user: ${user.username})`);

    // Send email - throw error if fails
    try {
      const emailSent = await MailService.sendResetPasswordMail(email, user.username, otp);
      if (!emailSent) {
        throw new Error('Gửi email đặt lại mật khẩu thất bại');
      }
      console.log(`resetPassword: Email sent successfully to ${email}`);
    } catch (error: any) {
      console.error(`resetPassword: Failed to send email to ${email}:`, error);
      throw new Error(`Gửi email thất bại: ${error.message || 'Lỗi không xác định'}`);
    }

    // Store in Redis with 15 minutes TTL (if available)
    // Note: Even if Redis fails, we still return success because email was sent
    try {
      await RedisService.set(`resetPassword:${email}`, user.id, 'EX', 900);
      await RedisService.set(`resetPassword:${email}:${otp}`, user.id, 'EX', 900);
      console.log(`resetPassword: OTP stored in Redis for ${email}`);
    } catch (redisError) {
      console.warn(`resetPassword: Failed to store OTP in Redis (non-critical):`, redisError);
      // Continue even if Redis fails - OTP is still sent via email
    }

    return true;
  }

  static async resetOTP(email: string, otp: string, password: string) {
    const userId = await RedisService.get(`resetPassword:${email}:${otp}`);

    if (!userId) {
      throw new Error('Mã OTP không hợp lệ');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Clean up Redis keys (if available)
    await RedisService.del(`resetPassword:${email}`);
    await RedisService.del(`resetPassword:${email}:${otp}`);

    return true;
  }
}

