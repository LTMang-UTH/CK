export const AppConfig = {
  // API Configuration
  APP_API_HOST: import.meta.env.VITE_API_HOST || 'http://localhost:3000',
  // Socket.IO uses HTTP/HTTPS base URL, namespace is specified separately
  WS_API_HOST: import.meta.env.VITE_WS_HOST || 'http://localhost:3000',
  WS_NAMESPACE: '/game',
  
  // Local Storage Keys (using sessionStorage for tab isolation)
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'fundraw_accessToken',
    USERNAME: 'fundraw_username',
    ROOM_ID: 'fundraw_roomId',
    IS_HOST: 'fundraw_isHost',
    IS_DRAWER: 'fundraw_isDrawer',
  },
} as const;

