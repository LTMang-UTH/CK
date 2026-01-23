import axios, { AxiosInstance, AxiosError } from 'axios';
import { AppConfig } from '../config/appConfig';
import { LocalStorage } from './storage';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: AppConfig.APP_API_HOST,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = LocalStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          LocalStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: Record<string, string>): Promise<T> {
    const formData = new URLSearchParams();
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    const response = await this.client.post(url, formData);
    return response.data;
  }
}

export const apiClient = new ApiClient();

