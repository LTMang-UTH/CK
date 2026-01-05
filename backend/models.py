"""
Pydantic Models cho RealChat API
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageType(str, Enum):
    """Loại tin nhắn"""
    TEXT = "TEXT"
    FILE = "FILE"
    NOTIFICATION = "NOTIFICATION"
    SYSTEM = "SYSTEM"


class PresenceStatus(str, Enum):
    """Trạng thái online/offline"""
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    AWAY = "AWAY"


# ============ User Models ============

class UserBase(BaseModel):
    """Thông tin cơ bản người dùng"""
    username: str = Field(..., min_length=3, max_length=20)
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    """Tạo người dùng mới"""
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Đăng nhập"""
    username: str
    password: str


class UserResponse(UserBase):
    """Phản hồi thông tin người dùng"""
    id: Optional[str] = Field(alias="_id")
    is_online: bool = False
    status: PresenceStatus = PresenceStatus.OFFLINE
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """Người dùng trong database"""
    id: Optional[str] = Field(alias="_id")
    password_hash: str
    is_online: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ============ Message Models ============

class MessageCreate(BaseModel):
    """Tạo tin nhắn mới"""
    content: str
    recipient: str
    message_type: MessageType = MessageType.TEXT


class MessagePrivate(BaseModel):
    """Tin nhắn cá nhân"""
    sender: str
    recipient: str
    content: str
    message_type: MessageType = MessageType.TEXT
    is_read: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MessageRoom(BaseModel):
    """Tin nhắn trong phòng"""
    room_id: str
    sender: str
    content: str
    message_type: MessageType = MessageType.TEXT
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MessageResponse(BaseModel):
    """Phản hồi tin nhắn"""
    id: Optional[str] = Field(alias="_id")
    sender: str
    recipient: Optional[str] = None
    room_id: Optional[str] = None
    content: str
    message_type: MessageType
    is_read: bool = False
    timestamp: datetime

    class Config:
        from_attributes = True


# ============ Room Models ============

class RoomCreate(BaseModel):
    """Tạo phòng chat mới"""
    room_name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    members: Optional[List[str]] = None


class RoomJoin(BaseModel):
    """Tham gia phòng"""
    room_id: str


class RoomResponse(BaseModel):
    """Phản hồi thông tin phòng"""
    id: Optional[str] = Field(alias="_id")
    room_name: str
    description: Optional[str] = None
    creator: str
    members: List[str] = []
    created_at: datetime
    invite_link: Optional[str] = None
    invite_code: Optional[str] = None

    class Config:
        from_attributes = True


class InvitationLinkCreate(BaseModel):
    """Tạo link mời tham gia"""
    expires_in_hours: int = 24


class InvitationLinkResponse(BaseModel):
    """Phản hồi invitation link"""
    id: Optional[str] = Field(alias="_id")
    room_id: str
    room_name: str
    creator: str
    invite_code: str
    invite_link: str
    created_by: str
    created_at: datetime
    expires_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True


class InvitationLinkJoin(BaseModel):
    """Tham gia phòng thông qua invitation link"""
    invite_code: str
    username: str


# ============ File Models ============

class FileUploadResponse(BaseModel):
    """Phản hồi upload file"""
    id: Optional[str] = Field(alias="_id")
    filename: str
    sender: str
    recipient: Optional[str] = None
    room_id: Optional[str] = None
    file_size: int
    file_url: str
    timestamp: datetime


# ============ Auth Models ============

class TokenData(BaseModel):
    """Dữ liệu token"""
    username: Optional[str] = None
    exp: Optional[int] = None


class Token(BaseModel):
    """Response token"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginResponse(Token):
    """Response đăng nhập"""
    pass


# ============ WebSocket Models ============

class ChatMessage(BaseModel):
    """Tin nhắn chat qua WebSocket"""
    type: str  # "message", "typing", "status"
    sender: str
    content: Optional[str] = None
    recipient: Optional[str] = None
    room_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
