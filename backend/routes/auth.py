"""
Authentication Routes - Đăng ký, Đăng nhập, JWT
"""
from fastapi import APIRouter, HTTPException, status
from datetime import timedelta
from models import UserCreate, UserLogin, UserResponse, Token, LoginResponse
from database import (
    create_user, get_user, update_user_online_status
)
from utils import (
    hash_password, verify_password, create_access_token,
    validate_username, validate_password, validate_email,
    format_user_response
)
from config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Đăng ký tài khoản mới
    """
    # Validate username
    is_valid, error = validate_username(user_data.username)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Validate password
    is_valid, error = validate_password(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Validate email nếu có
    if user_data.email:
        is_valid, error = validate_email(user_data.email)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    # Check if user exists
    existing_user = await get_user(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username đã tồn tại"
        )
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user
    try:
        new_user = await create_user(
            username=user_data.username,
            email=user_data.email,
            password_hash=password_hash
        )
        return format_user_response(new_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin):
    """
    Đăng nhập và nhận JWT token
    """
    # Get user
    user = await get_user(credentials.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username hoặc mật khẩu sai",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username hoặc mật khẩu sai",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update online status
    await update_user_online_status(credentials.username, True)
    
    # Create token
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    access_token = create_access_token(
        data={"sub": credentials.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }


@router.post("/logout")
async def logout(username: str):
    """
    Đăng xuất - Set trạng thái thành Offline
    """
    user = await get_user(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User không tồn tại"
        )
    
    await update_user_online_status(username, False)
    return {"message": "Đã đăng xuất thành công"}
