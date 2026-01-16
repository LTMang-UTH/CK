"""
Utility functions cho RealChat API
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import JWTError, jwt
from config import settings
import logging
import re
import bcrypt

logger = logging.getLogger(__name__)


# ============ PASSWORD FUNCTIONS ============

def hash_password(password: str) -> str:
    """Hash mật khẩu (bcrypt max 72 bytes)"""
    # Truncate to 72 bytes (bcrypt limitation)
    password = password[:72].encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu"""
    # Truncate to 72 bytes (bcrypt limitation)
    plain_password = plain_password[:72].encode('utf-8')
    hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password, hashed_password)


# ============ JWT FUNCTIONS ============

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo JWT token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Kiểm tra và giải mã token"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username, "exp": payload.get("exp")}
    except JWTError:
        return None


# ============ VALIDATION FUNCTIONS ============

def validate_username(username: str) -> Tuple[bool, str]:
    """
    Kiểm tra username
    - Chiều dài: 3-20 ký tự
    - Chấp nhận: chữ (tiếng Anh/Việt), số, underscore
    """
    if not username:
        return False, "Username không được để trống"
    
    if len(username) < 3 or len(username) > 20:
        return False, "Username phải từ 3-20 ký tự"
    
    # Allow Unicode letters, numbers, underscore
    if not re.match(r"^[\w\u0100-\uFFFF]+$", username, re.UNICODE):
        return False, "Username chỉ được chứa chữ cái, số, và dấu gạch dưới"
    
    return True, ""


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Kiểm tra mật khẩu
    - Chiều dài: ≥ 6 ký tự
    """
    if not password:
        return False, "Mật khẩu không được để trống"
    
    if len(password) < 6:
        return False, "Mật khẩu phải ≥ 6 ký tự"
    
    return True, ""


def validate_email(email: str) -> Tuple[bool, str]:
    """Kiểm tra email"""
    if not email:
        return True, ""  # Email optional
    
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if re.match(pattern, email):
        return True, ""
    
    return False, "Email không hợp lệ"


def validate_room_name(room_name: str) -> Tuple[bool, str]:
    """Kiểm tra tên phòng"""
    if not room_name:
        return False, "Tên phòng không được để trống"
    
    if len(room_name) < 1 or len(room_name) > 50:
        return False, "Tên phòng phải từ 1-50 ký tự"
    
    return True, ""


# ============ FORMATTING FUNCTIONS ============

def format_user_response(user: Dict[str, Any]) -> Dict[str, Any]:
    """Format user response (loại bỏ mật khẩu)"""
    return {
        "_id": str(user.get("_id", "")),
        "username": user.get("username"),
        "email": user.get("email"),
        "is_online": user.get("is_online", False),
        "last_login": user.get("last_login"),
        "created_at": user.get("created_at"),
    }


def format_message_response(message: Dict[str, Any]) -> Dict[str, Any]:
    """Format message response"""
    room_id = message.get("room_id")
    # Convert ObjectId to string if needed
    if room_id is not None:
        room_id = str(room_id)
    
    return {
        "_id": str(message.get("_id", "")),
        "sender": message.get("sender"),
        "recipient": message.get("recipient"),
        "room_id": room_id,
        "content": message.get("content"),
        "message_type": message.get("message_type", "TEXT"),
        "is_read": message.get("is_read", False),
        "timestamp": message.get("timestamp"),
    }


def format_room_response(room: Dict[str, Any]) -> Dict[str, Any]:
    """Format room response"""
    return {
        "_id": str(room.get("_id", "")),
        "room_name": room.get("room_name"),
        "description": room.get("description"),
        "creator": room.get("creator"),
        "members": room.get("members", []),
        "created_at": room.get("created_at"),
    }

def format_invitation_link_response(link: Dict[str, Any]) -> Dict[str, Any]:
    """Format invitation link response"""
    return {
        "_id": str(link.get("_id", "")),
        "room_id": link.get("room_id"),
        "room_name": link.get("room_name"),
        "creator": link.get("creator"),
        "invite_code": link.get("invite_code"),
        "invite_link": f"realchat://invite/{link.get('invite_code')}",
        "created_by": link.get("created_by"),
        "created_at": link.get("created_at"),
        "expires_at": link.get("expires_at"),
        "is_active": link.get("is_active", True),
    }