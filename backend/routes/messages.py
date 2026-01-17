"""
Message Routes - Lấy tin nhắn, Gửi tin nhắn
"""
from fastapi import APIRouter, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import List, Dict, Set
from models import MessageCreate, MessageResponse
from database import (
    save_message, get_private_messages, get_unread_messages,
    get_user, mark_message_as_read
)
from utils import format_message_response
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messages", tags=["messages"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, username: str, websocket: WebSocket):
        await websocket.accept()
        if username not in self.active_connections:
            self.active_connections[username] = []
        self.active_connections[username].append(websocket)
    
    def disconnect(self, username: str, websocket: WebSocket):
        if username in self.active_connections:
            self.active_connections[username].remove(websocket)
            if not self.active_connections[username]:
                del self.active_connections[username]
    
    async def broadcast(self, message: dict):
        """Broadcast to all connected clients"""
        recipient = message.get("recipient")
        if recipient and recipient in self.active_connections:
            for connection in self.active_connections[recipient]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
    
    async def send_personal_message(self, username: str, message: dict):
        """Send to specific user"""
        if username in self.active_connections:
            for connection in self.active_connections[username]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending personal message: {e}")

manager = ConnectionManager()


@router.get("/private/{username}", response_model=List[MessageResponse])
async def get_private_chat(username: str, other_user: str, limit: int = 50):
    """
    Lấy lịch sử tin nhắn riêng tư với người dùng
    """
    # Verify user exists
    other = await get_user(other_user)
    if not other:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User không tồn tại"
        )
    
    messages = await get_private_messages(username, other_user, limit)
    return [format_message_response(m) for m in messages]


@router.get("/unread/{username}", response_model=List[MessageResponse])
async def get_unread(username: str):
    """
    Lấy tin nhắn chưa đọc
    """
    messages = await get_unread_messages(username)
    return [format_message_response(m) for m in messages]


@router.post("/send", response_model=MessageResponse)
async def send_message(username: str, message_data: MessageCreate):
    """
    Gửi tin nhắn
    """
    # Sanitize message content
    from middleware import sanitize_input
    sanitized_content = sanitize_input(message_data.content, max_length=5000)
    
    # Verify recipient exists
    recipient = await get_user(message_data.recipient)
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người nhận không tồn tại"
        )
    
    # Save message with sanitized content
    message = await save_message(
        sender=username,
        recipient=message_data.recipient,
        content=sanitized_content,
        message_type=message_data.message_type
    )
    
    # Broadcast via WebSocket
    await manager.broadcast({
        "type": "message",
        "sender": username,
        "recipient": message_data.recipient,
        "content": message_data.content,
        "timestamp": message.get("timestamp").isoformat()
    })
    
    return format_message_response(message)


@router.put("/mark-read/{message_id}")
async def mark_as_read(message_id: str):
    """
    Đánh dấu tin nhắn đã đọc
    """
    success = await mark_message_as_read(message_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tin nhắn không tồn tại"
        )
    return {"message": "Đã đánh dấu đã đọc"}


@router.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    """
    WebSocket endpoint để nhận tin nhắn real-time
    """
    await manager.connect(username, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Add sender and timestamp
            message_data["sender"] = username
            message_data["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            # Broadcast message
            await manager.broadcast(message_data)
    except WebSocketDisconnect:
        manager.disconnect(username, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(username, websocket)
