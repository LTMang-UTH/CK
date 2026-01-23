import bcrypt from 'bcrypt';
import { prisma } from './prisma.service';
import { JWTService } from './jwt.service';

export class AuthService {
  static async login(username: string, password: string) {
    const user = await prisma.users.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error('Tài khoản không tồn tại');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Mật khẩu không đúng');
    }

    // Clear old tokens
    await JWTService.clearOldTokens(user.id);

    // Generate new token
    const accessToken = await JWTService.setAccessToken(user.id);

    // Remove sensitive data
    const { password: _, accessToken: __, refreshToken: ___, ...userData } = user;

    return {
      user: userData,
      accessToken,
    };
  }

  static async register(
    username: string,
    password: string,
    confirmPassword: string,
    email: string
  ) {
    // Check if username exists
    const userExist = await prisma.users.findUnique({
      where: { username },
    });

    if (userExist) {
      throw new Error('Tên đăng nhập đã tồn tại!');
    }

    // Check if email exists
    const emailExist = await prisma.users.findUnique({
      where: { email },
    });

    if (emailExist) {
      throw new Error('Email đã tồn tại!');
    }

    // Check password match
    if (password !== confirmPassword) {
      throw new Error('Mật khẩu không khớp!');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });

    // Generate token
    const accessToken = await JWTService.setAccessToken(user.id);

    // Remove sensitive data
    const { password: _, accessToken: __, refreshToken: ___, ...userData } = user;

    return {
      user: userData,
      accessToken,
    };
  }

  static async logout(userId: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    // Clear tokens
    await JWTService.clearOldTokens(userId);
    await prisma.users.update({
      where: { id: userId },
      data: { accessToken: null },
    });

    return true;
  }
}

