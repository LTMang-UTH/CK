import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/fundraw_db?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'access-token-secret',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret',
  mailHost: process.env.MAIL_HOST || 'smtp.gmail.com',
  mailUser: process.env.MAIL_USER || '',
  mailPass: process.env.MAIL_PASS || '',
  mailSendAs: process.env.MAIL_SENDAS || '',
};

