import { apiClient } from './apiClient';
import { LocalStorage } from './storage';
import type { LoginResponse, UserProfile } from '../types';

export class AuthService {
  static async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username,
        password,
      });

      if (response.data?.accessToken) {
        LocalStorage.setAccessToken(response.data.accessToken);
        LocalStorage.setUsername(response.data.user.username);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    }
  }

  static async register(
    username: string,
    password: string,
    email: string
  ): Promise<boolean> {
    try {
      await apiClient.post('/auth/register', {
        username,
        password,
        confirm_password: password,
        email,
      });
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      return false;
    }
  }

  static async logout(): Promise<boolean> {
    try {
      const token = LocalStorage.getAccessToken();
      if (token) {
        await apiClient.post('/auth/logout', {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      LocalStorage.clear(); // This clears both auth and room data
      return true;
    } catch (error: any) {
      console.error('Logout error:', error);
      LocalStorage.clear(); // Clear anyway
      return false;
    }
  }

  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get<UserProfile>('/users/profile');
      return response;
    } catch (error: any) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  static async changePassword(password: string): Promise<boolean> {
    try {
      await apiClient.post('/users/change-password', {
        password,
        confirm_password: password,
      });
      return true;
    } catch (error: any) {
      console.error('Change password error:', error);
      return false;
    }
  }

  static async forgotPassword(email: string): Promise<boolean> {
    try {
      const response = await apiClient.post('/users/reset-password', { email });
      console.log('Forgot password response:', response);
      return true;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      console.error('Error response:', error.response?.data);
      // Throw error để frontend có thể hiển thị message cụ thể
      throw error;
    }
  }

  static async resetPasswordOTP(
    email: string,
    otp: string,
    password: string
  ): Promise<boolean> {
    try {
      await apiClient.post('/users/reset-otp', {
        email,
        otp,
        password,
        confirm_password: password,
      });
      return true;
    } catch (error: any) {
      console.error('Reset password OTP error:', error);
      return false;
    }
  }
}

