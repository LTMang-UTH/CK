import { AppConfig } from '../config/appConfig';

/**
 * Storage service using sessionStorage instead of localStorage
 * This ensures each browser tab has its own independent session
 * - sessionStorage is tab-specific (not shared between tabs)
 * - Data is cleared when tab is closed
 * - Each tab can have different logged-in users
 */
export class LocalStorage {
  static getAccessToken(): string {
    return sessionStorage.getItem(AppConfig.STORAGE_KEYS.ACCESS_TOKEN) || '';
  }

  static setAccessToken(token: string): void {
    sessionStorage.setItem(AppConfig.STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  static getUsername(): string {
    return sessionStorage.getItem(AppConfig.STORAGE_KEYS.USERNAME) || '';
  }

  static setUsername(username: string): void {
    sessionStorage.setItem(AppConfig.STORAGE_KEYS.USERNAME, username);
  }

  static clear(): void {
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.USERNAME);
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.ROOM_ID);
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.IS_HOST);
  }

  // Room state persistence
  static getRoomId(): string {
    return sessionStorage.getItem(AppConfig.STORAGE_KEYS.ROOM_ID) || '';
  }

  static setRoomId(roomId: string): void {
    if (roomId) {
      sessionStorage.setItem(AppConfig.STORAGE_KEYS.ROOM_ID, roomId);
    } else {
      sessionStorage.removeItem(AppConfig.STORAGE_KEYS.ROOM_ID);
    }
  }

  static getIsHost(): boolean {
    return sessionStorage.getItem(AppConfig.STORAGE_KEYS.IS_HOST) === 'true';
  }

  static setIsHost(isHost: boolean): void {
    sessionStorage.setItem(AppConfig.STORAGE_KEYS.IS_HOST, isHost.toString());
  }

  static getIsDrawer(): boolean {
    return sessionStorage.getItem(AppConfig.STORAGE_KEYS.IS_DRAWER) === 'true';
  }

  static setIsDrawer(isDrawer: boolean): void {
    if (isDrawer) {
      sessionStorage.setItem(AppConfig.STORAGE_KEYS.IS_DRAWER, 'true');
    } else {
      sessionStorage.removeItem(AppConfig.STORAGE_KEYS.IS_DRAWER);
    }
  }

  static clearRoom(): void {
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.ROOM_ID);
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.IS_HOST);
    sessionStorage.removeItem(AppConfig.STORAGE_KEYS.IS_DRAWER);
  }
}

