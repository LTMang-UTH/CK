"""
Cấu hình cho ứng dụng RealChat
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Cài đặt ứng dụng"""
    
    # MongoDB Atlas
    MONGODB_URL: str = "mongodb+srv://congtubotzp205_db_user:g1tLaFTI8wk9MyIC@ltm.upqpjei.mongodb.net/?appName=LTM"
    DATABASE_NAME: str = "realchat_db"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production-realchat-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",  # Vue dev server (Vite)
        "http://localhost:3000",  # Alternative frontend port
        "http://127.0.0.1:5173",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
