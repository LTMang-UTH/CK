"""
User Routes - Lấy danh sách users, trạng thái online
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from models import UserResponse
from database import get_user, get_all_users, get_online_users
from utils import format_user_response

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[UserResponse])
async def get_users():
    """
    Lấy danh sách tất cả users
    """
    users = await get_all_users()
    return [format_user_response(u) for u in users]


@router.get("/online", response_model=List[UserResponse])
async def get_online():
    """
    Lấy danh sách users đang online
    """
    users = await get_online_users()
    return [format_user_response(u) for u in users]


@router.get("/{username}", response_model=UserResponse)
async def get_user_profile(username: str):
    """
    Lấy thông tin profile người dùng
    """
    user = await get_user(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User không tồn tại"
        )
    return format_user_response(user)
