"""
MongoDB Database Connection và CRUD Operations
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from config import settings
import logging

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB Connection Manager"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None

    async def connect_db(self):
        """Kết nối MongoDB"""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.db = self.client[settings.DATABASE_NAME]
            
            # Tạo collections và indexes
            await self._create_collections()
            await self._create_indexes()
            
            logger.info("✅ Connected to MongoDB successfully")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise

    async def close_db(self):
        """Đóng kết nối MongoDB"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    async def _create_collections(self):
        """Tạo các collections nếu chưa tồn tại"""
        collections = ["users", "messages", "rooms", "room_members", "files", "invitation_links"]
        for collection in collections:
            try:
                await self.db.create_collection(collection)
                logger.info(f"Created collection: {collection}")
            except Exception as e:
                # Collection có thể đã tồn tại, bỏ qua
                pass

    async def _create_indexes(self):
        """Tạo indexes để tối ưu hiệu năng"""
        try:
            # Users collection
            users = self.db["users"]
            await users.create_index("username", unique=True)
            await users.create_index("email", unique=True, sparse=True)

            # Messages collection
            messages = self.db["messages"]
            await messages.create_index([("sender", 1), ("timestamp", -1)])
            await messages.create_index([("recipient", 1), ("timestamp", -1)])
            await messages.create_index("room_id")
            await messages.create_index([("timestamp", -1)])

            # Rooms collection
            rooms = self.db["rooms"]
            await rooms.create_index("room_name", unique=True)
            await rooms.create_index("creator")

            # Files collection
            files = self.db["files"]
            await files.create_index([("sender", 1), ("timestamp", -1)])
            await files.create_index("recipient")

            # Invitation Links collection
            invitation_links = self.db["invitation_links"]
            await invitation_links.create_index("invite_code", unique=True)
            await invitation_links.create_index("room_id")
            await invitation_links.create_index([("expires_at", 1)])

            logger.info("✅ Indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")


# Global MongoDB instance
db = MongoDB()


# ============ USER OPERATIONS ============

async def create_user(username: str, email: Optional[str], password_hash: str) -> Dict[str, Any]:
    """Tạo user mới"""
    try:
        user = {
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "is_online": False,
            "last_login": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.db["users"].insert_one(user)
        user["_id"] = result.inserted_id
        return user
    except DuplicateKeyError:
        raise ValueError(f"Username '{username}' hoặc email đã tồn tại")


async def get_user(username: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin user theo username"""
    return await db.db["users"].find_one({"username": username})


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin user theo ID"""
    from bson.objectid import ObjectId
    return await db.db["users"].find_one({"_id": ObjectId(user_id)})


async def get_all_users() -> List[Dict[str, Any]]:
    """Lấy tất cả users (không lấy password_hash)"""
    users = []
    cursor = db.db["users"].find({}, {"password_hash": 0})
    async for user in cursor:
        users.append(user)
    return users


async def get_online_users() -> List[Dict[str, Any]]:
    """Lấy danh sách users đang online"""
    users = []
    cursor = db.db["users"].find({"is_online": True}, {"password_hash": 0})
    async for user in cursor:
        users.append(user)
    return users


async def update_user_online_status(username: str, is_online: bool) -> bool:
    """Cập nhật trạng thái online của user"""
    result = await db.db["users"].update_one(
        {"username": username},
        {
            "$set": {
                "is_online": is_online,
                "last_login": datetime.now(timezone.utc) if is_online else None,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return result.modified_count > 0


# ============ MESSAGE OPERATIONS ============

async def save_message(
    sender: str,
    recipient: Optional[str] = None,
    room_id: Optional[str] = None,
    content: str = "",
    message_type: str = "TEXT",
) -> Dict[str, Any]:
    """Lưu tin nhắn"""
    from bson.objectid import ObjectId
    
    message = {
        "sender": sender,
        "recipient": recipient,
        "room_id": ObjectId(room_id) if room_id else None,
        "content": content,
        "message_type": message_type,
        "is_read": False,
        "timestamp": datetime.now(timezone.utc),
    }
    result = await db.db["messages"].insert_one(message)
    message["_id"] = result.inserted_id
    return message


async def get_private_messages(user1: str, user2: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Lấy tin nhắn riêng tư giữa 2 người"""
    messages = []
    cursor = db.db["messages"].find(
        {
            "$or": [
                {"$and": [{"sender": user1}, {"recipient": user2}]},
                {"$and": [{"sender": user2}, {"recipient": user1}]},
            ]
        }
    ).sort("timestamp", -1).limit(limit)
    
    async for msg in cursor:
        messages.append(msg)
    
    return list(reversed(messages))  # Sắp xếp tăng dần


async def get_room_messages(room_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Lấy tin nhắn từ phòng"""
    from bson.objectid import ObjectId
    if not room_id or room_id == 'undefined':
        return []
    try:
        messages = []
        cursor = db.db["messages"].find({"room_id": ObjectId(room_id)}).sort("timestamp", -1).limit(limit)
        
        async for msg in cursor:
            messages.append(msg)
        
        return list(reversed(messages))
    except Exception:
        return []


async def mark_message_as_read(message_id: str) -> bool:
    """Đánh dấu tin nhắn đã đọc"""
    from bson.objectid import ObjectId
    result = await db.db["messages"].update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_read": True, "updated_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


async def get_unread_messages(username: str) -> List[Dict[str, Any]]:
    """Lấy tin nhắn chưa đọc"""
    messages = []
    cursor = db.db["messages"].find(
        {"recipient": username, "is_read": False}
    ).sort("timestamp", -1)
    
    async for msg in cursor:
        messages.append(msg)
    
    return messages


# ============ ROOM OPERATIONS ============

async def create_room(room_name: str, creator: str, description: Optional[str] = None, members: Optional[List[str]] = None) -> Dict[str, Any]:
    """Tạo phòng chat mới"""
    try:
        # Đảm bảo creator luôn trong members
        room_members = [creator]
        if members:
            for member in members:
                if member not in room_members:
                    room_members.append(member)
        
        room = {
            "room_name": room_name,
            "description": description,
            "creator": creator,
            "members": room_members,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.db["rooms"].insert_one(room)
        room["_id"] = result.inserted_id
        return room
    except DuplicateKeyError:
        raise ValueError(f"Phòng '{room_name}' đã tồn tại")


async def get_room(room_id: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin phòng"""
    from bson.objectid import ObjectId
    if not room_id or room_id == 'undefined':
        return None
    try:
        return await db.db["rooms"].find_one({"_id": ObjectId(room_id)})
    except Exception:
        return None


async def get_all_rooms() -> List[Dict[str, Any]]:
    """Lấy tất cả phòng"""
    rooms = []
    cursor = db.db["rooms"].find({}).sort("created_at", -1)
    async for room in cursor:
        rooms.append(room)
    return rooms


async def join_room(room_id: str, username: str) -> bool:
    """Tham gia phòng"""
    from bson.objectid import ObjectId
    result = await db.db["rooms"].update_one(
        {"_id": ObjectId(room_id)},
        {
            "$addToSet": {"members": username},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
    return result.modified_count > 0


async def leave_room(room_id: str, username: str) -> bool:
    """Rời khỏi phòng"""
    from bson.objectid import ObjectId
    result = await db.db["rooms"].update_one(
        {"_id": ObjectId(room_id)},
        {
            "$pull": {"members": username},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return result.modified_count > 0


async def get_user_rooms(username: str) -> List[Dict[str, Any]]:
    """Lấy danh sách phòng của user"""
    rooms = []
    cursor = db.db["rooms"].find({"members": username}).sort("created_at", -1)
    async for room in cursor:
        rooms.append(room)
    return rooms


# ============ FILE OPERATIONS ============

async def save_file(
    filename: str,
    sender: str,
    recipient: Optional[str] = None,
    room_id: Optional[str] = None,
    file_size: int = 0,
    file_data: bytes = b"",
) -> Dict[str, Any]:
    """Lưu file"""
    import base64
    file_obj = {
        "filename": filename,
        "sender": sender,
        "recipient": recipient,
        "room_id": room_id,
        "file_size": file_size,
        "file_data": base64.b64encode(file_data).decode() if file_data else "",
        "timestamp": datetime.utcnow(),
    }
    result = await db.db["files"].insert_one(file_obj)
    file_obj["_id"] = result.inserted_id
    return file_obj


async def get_file(file_id: str) -> Optional[Dict[str, Any]]:
    """Lấy file theo ID"""
    from bson.objectid import ObjectId
    return await db.db["files"].find_one({"_id": ObjectId(file_id)})


async def get_user_files(username: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Lấy danh sách file của user"""
    files = []
    cursor = (
        db.db["files"]
        .find({"$or": [{"sender": username}, {"recipient": username}]})
        .sort("timestamp", -1)
        .limit(limit)
    )
    async for file in cursor:
        # Không lấy file_data trong list
        file.pop("file_data", None)
        files.append(file)
    return files


# ============ INVITATION LINK OPERATIONS ============

async def create_invitation_link(
    room_id: str, room_name: str, creator: str, created_by: str, expires_in_hours: int = 24
) -> Dict[str, Any]:
    """Tạo invitation link cho phòng"""
    import uuid
    from datetime import timedelta
    
    invite_code = str(uuid.uuid4())[:8].upper()
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
    
    invitation = {
        "room_id": room_id,
        "room_name": room_name,
        "creator": creator,
        "invite_code": invite_code,
        "created_by": created_by,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
        "is_active": True,
        "used_by": [],
    }
    result = await db.db["invitation_links"].insert_one(invitation)
    invitation["_id"] = result.inserted_id
    return invitation


async def get_invitation_link(invite_code: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin invitation link"""
    return await db.db["invitation_links"].find_one({"invite_code": invite_code})


async def validate_invitation_link(invite_code: str) -> Tuple[bool, str]:
    """Kiểm tra invitation link có hợp lệ không"""
    link = await get_invitation_link(invite_code)
    
    if not link:
        return False, "Invitation link không tồn tại"
    
    if not link.get("is_active"):
        return False, "Invitation link đã bị vô hiệu hóa"
    
    if datetime.utcnow() > link.get("expires_at", datetime.utcnow()):
        return False, "Invitation link đã hết hạn"
    
    return True, ""


async def use_invitation_link(invite_code: str, username: str) -> bool:
    """Sử dụng invitation link (thêm user vào phòng)"""
    result = await db.db["invitation_links"].update_one(
        {"invite_code": invite_code},
        {
            "$addToSet": {"used_by": username},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
    return result.modified_count > 0


async def get_room_invitation_links(room_id: str) -> List[Dict[str, Any]]:
    """Lấy tất cả invitation links của một phòng"""
    links = []
    cursor = db.db["invitation_links"].find({"room_id": room_id}).sort("created_at", -1)
    async for link in cursor:
        links.append(link)
    return links


async def disable_invitation_link(invite_code: str) -> bool:
    """Vô hiệu hóa invitation link"""
    result = await db.db["invitation_links"].update_one(
        {"invite_code": invite_code},
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.utcnow(),
            }
        },
    )
    return result.modified_count > 0
