"""
Room Routes - Tạo phòng, Tham gia phòng, Lấy tin nhắn từ phòng, Invitation Links
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from models import RoomCreate, RoomResponse, MessageResponse, InvitationLinkCreate, InvitationLinkResponse, InvitationLinkJoin, MessageRoom
from database import (
    create_room, get_room, get_all_rooms, join_room, leave_room,
    get_user_rooms, get_user, save_message, get_room_messages,
    create_invitation_link, validate_invitation_link, use_invitation_link,
    get_room_invitation_links, disable_invitation_link, get_invitation_link
)
from utils import format_room_response, format_message_response, validate_room_name, format_invitation_link_response

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_new_room(room_data: RoomCreate, username: str = None):
    """
    Tạo phòng chat mới (với username từ query parameter hoặc body)
    """
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username bắt buộc"
        )
    
    # Validate room name
    is_valid, error = validate_room_name(room_data.room_name)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    try:
        room = await create_room(
            room_name=room_data.room_name,
            creator=username,
            description=room_data.description,
            members=room_data.members
        )
        return format_room_response(room)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[RoomResponse])
async def get_rooms(username: str = None):
    """
    Lấy phòng - tất cả phòng nếu không có username, hoặc phòng của user cụ thể
    """
    try:
        if username:
            # Lấy phòng của user cụ thể
            rooms = await get_user_rooms(username)
        else:
            # Lấy tất cả phòng
            rooms = await get_all_rooms()
        return [format_room_response(r) for r in rooms]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/user/{username}", response_model=List[RoomResponse])
async def get_user_rooms_list(username: str):
    """
    Lấy danh sách phòng của user
    """
    try:
        rooms = await get_user_rooms(username)
        return [format_room_response(r) for r in rooms]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============ INVITATION LINK ENDPOINTS (MUST come before {room_id} routes) ============

@router.post("/invite/validate")
async def validate_invite(invite_code: str):
    """
    Kiểm tra tính hợp lệ của invitation link
    """
    is_valid, error = await validate_invitation_link(invite_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    link = await get_invitation_link(invite_code)
    return format_invitation_link_response(link)


@router.post("/invite/join")
async def join_via_invite(invite_data: InvitationLinkJoin):
    """
    Tham gia phòng thông qua invitation link
    """
    # Kiểm tra tính hợp lệ của link
    is_valid, error = await validate_invitation_link(invite_data.invite_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Lấy thông tin link
    link = await get_invitation_link(invite_data.invite_code)
    room_id = link.get("room_id")
    room = await get_room(room_id)
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    # Tham gia phòng
    success = await join_room(room_id, invite_data.username)
    
    # Sử dụng link
    await use_invitation_link(invite_data.invite_code, invite_data.username)
    
    # Gửi system message
    await save_message(
        sender="SYSTEM",
        room_id=room_id,
        content=f"{invite_data.username} vừa tham gia phòng qua invitation link",
        message_type="SYSTEM"
    )
    
    return {
        "message": "Đã tham gia phòng thành công",
        "room_id": room_id,
        "room_name": room.get("room_name")
    }


# ============ ROOM ENDPOINTS (with room_id) ============

@router.post("/{room_id}/join")
async def join_chat_room(room_id: str, username: str):
    """
    Tham gia phòng chat
    """
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    success = await join_room(room_id, username)
    if not success:
        return {"message": "Đã có trong phòng"}
    
    # Send system message
    await save_message(
        sender="SYSTEM",
        room_id=room_id,
        content=f"{username} vừa tham gia phòng",
        message_type="SYSTEM"
    )
    
    return {"message": "Đã tham gia phòng thành công"}


@router.post("/{room_id}/leave")
async def leave_chat_room(room_id: str, username: str):
    """
    Rời khỏi phòng chat
    """
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    success = await leave_room(room_id, username)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lỗi khi rời phòng"
        )
    
    # Send system message
    await save_message(
        sender="SYSTEM",
        room_id=room_id,
        content=f"{username} vừa rời khỏi phòng",
        message_type="SYSTEM"
    )
    
    return {"message": "Đã rời khỏi phòng"}


@router.get("/{room_id}/messages", response_model=List[MessageResponse])
async def get_room_messages_list(room_id: str, limit: int = 50):
    """
    Lấy tin nhắn từ phòng
    """
    if not room_id or room_id == 'undefined':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room ID không hợp lệ"
        )
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    messages = await get_room_messages(room_id, limit)
    return [format_message_response(m) for m in messages]


# ============ ROOM MESSAGE ENDPOINTS ============

@router.post("/{room_id}/messages", response_model=MessageResponse)
async def send_room_message(room_id: str, message_data: MessageRoom):
    """
    Gửi tin nhắn trong phòng
    """
    if not room_id or room_id == 'undefined':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room ID không hợp lệ"
        )
    
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    # Kiểm tra user có trong phòng không
    if message_data.sender not in room.get("members", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải thành viên của phòng này"
        )
    
    try:
        message = await save_message(
            sender=message_data.sender,
            room_id=room_id,
            content=message_data.content,
            message_type=message_data.message_type
        )
        return format_message_response(message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi gửi tin nhắn: {str(e)}"
        )


# ============ INVITATION LINK MANAGEMENT (with room_id) ============

@router.post("/{room_id}/invite", response_model=InvitationLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_invite_link(room_id: str, invite_data: InvitationLinkCreate, username: str):
    """
    Tạo invitation link cho phòng (chỉ creator có thể tạo)
    """
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    # Kiểm tra quyền (chỉ creator có thể tạo invitation)
    if room.get("creator") != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ creator phòng mới có thể tạo invitation link"
        )
    
    try:
        link = await create_invitation_link(
            room_id=room_id,
            room_name=room.get("room_name"),
            creator=room.get("creator"),
            created_by=username,
            expires_in_hours=invite_data.expires_in_hours
        )
        return format_invitation_link_response(link)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{room_id}/invites", response_model=List[InvitationLinkResponse])
async def get_invite_links(room_id: str, username: str):
    """
    Lấy danh sách invitation links của phòng (chỉ creator)
    """
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    # Kiểm tra quyền
    if room.get("creator") != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ creator phòng mới có thể xem invitation links"
        )
    
    links = await get_room_invitation_links(room_id)
    return [format_invitation_link_response(link) for link in links]


@router.post("/{room_id}/invites/{invite_code}/disable")
async def disable_invite(room_id: str, invite_code: str, username: str):
    """
    Vô hiệu hóa invitation link (chỉ creator)
    """
    room = await get_room(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phòng không tồn tại"
        )
    
    # Kiểm tra quyền
    if room.get("creator") != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ creator phòng mới có thể vô hiệu hóa invitation"
        )
    
    success = await disable_invitation_link(invite_code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lỗi khi vô hiệu hóa invitation"
        )
    
    return {"message": "Đã vô hiệu hóa invitation link"}
