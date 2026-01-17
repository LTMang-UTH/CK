"""
Cấu hình cho ứng dụng RealChat
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Cài đặt ứng dụng"""
    
    # MongoDB Atlas - Load from environment variables
    MONGODB_URL: str
    DATABASE_NAME: str = "realchat_db"
    
    # JWT - Load from environment variables
    SECRET_KEY: str
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
