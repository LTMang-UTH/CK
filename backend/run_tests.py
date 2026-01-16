#!/usr/bin/env python3
"""
RealChat - Automated Test Script
Tests all functionality of the RealChat application
"""
import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any, List

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

# Test data
TEST_USERS = [
    {"username": "testuser1", "password": "password123", "email": "test1@example.com"},
    {"username": "testuser2", "password": "password123", "email": "test2@example.com"},
    {"username": "testuser3", "password": "password123", "email": "test3@example.com"},
]

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKCYAN}→ {text}{Colors.ENDC}")


class RealChatTester:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.tokens: Dict[str, str] = {}
        self.test_results: List[Dict[str, Any]] = []
        self.created_room_id: Optional[str] = None
        self.invite_code: Optional[str] = None

    async def setup(self):
        """Setup test session"""
        print_header("Setting Up Test Environment")
        self.session = aiohttp.ClientSession(
            headers={"Content-Type": "application/json"}
        )
        print_success("HTTP session created")

    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
            print_success("HTTP session closed")

    async def test_health_check(self) -> bool:
        """Test health check endpoint"""
        print_header("Testing Health Check")
        try:
            async with self.session.get(f"{BASE_URL}/health") as response:
                data = await response.json()
                if response.status == 200 and data.get("status") == "healthy":
                    print_success(f"Health check: {data}")
                    return True
                else:
                    print_error(f"Health check failed: {data}")
                    return False
        except Exception as e:
            print_error(f"Health check error: {e}")
            return False

    async def test_auth_registration(self) -> bool:
        """Test user registration"""
        print_header("Testing User Registration")
        success = True
        
        for user in TEST_USERS:
            try:
                async with self.session.post(
                    f"{BASE_URL}/api/auth/register",
                    json=user
                ) as response:
                    data = await response.json()
                    if response.status == 201:
                        print_success(f"Registered: {user['username']}")
                    elif response.status == 400 and "đã tồn tại" in str(data):
                        print_info(f"User already exists: {user['username']}")
                    else:
                        print_error(f"Registration failed for {user['username']}: {data}")
                        success = False
            except Exception as e:
                print_error(f"Registration error for {user['username']}: {e}")
                success = False
        
        return success

    async def test_auth_login(self) -> bool:
        """Test user login"""
        print_header("Testing User Login")
        success = True
        
        for user in TEST_USERS:
            try:
                async with self.session.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"username": user["username"], "password": user["password"]}
                ) as response:
                    data = await response.json()
                    if response.status == 200:
                        self.tokens[user["username"]] = data.get("access_token")
                        print_success(f"Logged in: {user['username']}")
                    else:
                        print_error(f"Login failed for {user['username']}: {data}")
                        success = False
            except Exception as e:
                print_error(f"Login error for {user['username']}: {e}")
                success = False
        
        return success

    async def test_auth_logout(self) -> bool:
        """Test user logout"""
        print_header("Testing User Logout")
        success = True
        
        for username in self.tokens.keys():
            try:
                async with self.session.post(
                    f"{BASE_URL}/api/auth/logout",
                    params={"username": username}
                ) as response:
                    data = await response.json()
                    if response.status == 200:
                        print_success(f"Logged out: {username}")
                    else:
                        print_error(f"Logout failed for {username}: {data}")
                        success = False
            except Exception as e:
                print_error(f"Logout error for {username}: {e}")
                success = False
        
        return success

    async def test_user_management(self) -> bool:
        """Test user management APIs"""
        print_header("Testing User Management")
        
        # Test get all users
        try:
            async with self.session.get(f"{BASE_URL}/api/users") as response:
                if response.status == 200:
                    users = await response.json()
                    print_success(f"Get all users: {len(users)} users found")
                else:
                    print_error(f"Get users failed: {response.status}")
                    return False
        except Exception as e:
            print_error(f"Get users error: {e}")
            return False
        
        # Test get online users
        try:
            async with self.session.get(f"{BASE_URL}/api/users/online") as response:
                if response.status == 200:
                    online_users = await response.json()
                    print_success(f"Get online users: {len(online_users)} users online")
                else:
                    print_error(f"Get online users failed: {response.status}")
        except Exception as e:
            print_error(f"Get online users error: {e}")
        
        # Test get user profile
        try:
            async with self.session.get(f"{BASE_URL}/api/users/{TEST_USERS[0]['username']}") as response:
                if response.status == 200:
                    user = await response.json()
                    print_success(f"Get user profile: {user.get('username')}")
                else:
                    print_error(f"Get user profile failed: {response.status}")
        except Exception as e:
            print_error(f"Get user profile error: {e}")
        
        return True

    async def test_room_creation(self) -> bool:
        """Test room creation"""
        print_header("Testing Room Creation")
        
        # Login first
        login_data = {
            "username": TEST_USERS[0]["username"],
            "password": TEST_USERS[0]["password"]
        }
        
        try:
            async with self.session.post(
                f"{BASE_URL}/api/auth/login",
                json=login_data
            ) as response:
                data = await response.json()
                if response.status == 200:
                    token = data.get("access_token")
                    self.tokens[TEST_USERS[0]["username"]] = token
                    
                    # Create room - username as query parameter
                    room_data = {
                        "room_name": "Test Room 1",
                        "description": "A test room for automated testing"
                    }
                    
                    async with self.session.post(
                        f"{BASE_URL}/api/rooms/?username={TEST_USERS[0]['username']}",
                        json=room_data
                    ) as room_response:
                        room = await room_response.json()
                        if room_response.status == 201:
                            self.created_room_id = room.get("_id")
                            print_success(f"Created room: {room.get('room_name')} (ID: {self.created_room_id})")
                            return True
                        else:
                            print_error(f"Room creation failed: {room}")
                            # Check if room name already exists, get existing room
                            if "đã tồn tại" in str(room):
                                print_info("Room name already exists, trying to get existing room...")
                                # Get a room for testing
                                try:
                                    async with self.session.get(
                                        f"{BASE_URL}/api/rooms/user/{TEST_USERS[0]['username']}"
                                    ) as get_resp:
                                        rooms = await get_resp.json()
                                        if rooms:
                                            self.created_room_id = rooms[0].get("_id")
                                            print_success(f"Using existing room: {self.created_room_id}")
                                            return True
                                except Exception:
                                    pass
                            return False
                else:
                    print_error(f"Login failed: {data}")
                    return False
        except Exception as e:
            print_error(f"Room creation error: {e}")
            return False

    async def test_room_management(self) -> bool:
        """Test room management APIs"""
        print_header("Testing Room Management")
        
        # Get all rooms
        try:
            async with self.session.get(f"{BASE_URL}/api/rooms/") as response:
                if response.status == 200:
                    rooms = await response.json()
                    print_success(f"Get all rooms: {len(rooms)} rooms found")
                    # Store a room ID for other tests if not set
                    if not self.created_room_id and rooms:
                        self.created_room_id = rooms[0].get("_id")
                else:
                    print_error(f"Get rooms failed: {response.status}")
        except Exception as e:
            print_error(f"Get rooms error: {e}")
        
        # Get user rooms
        try:
            async with self.session.get(
                f"{BASE_URL}/api/rooms/user/{TEST_USERS[0]['username']}"
            ) as response:
                if response.status == 200:
                    user_rooms = await response.json()
                    print_success(f"Get user rooms: {len(user_rooms)} rooms")
                    # Store room ID if not set
                    if not self.created_room_id and user_rooms:
                        self.created_room_id = user_rooms[0].get("_id")
                else:
                    print_error(f"Get user rooms failed: {response.status}")
        except Exception as e:
            print_error(f"Get user rooms error: {e}")
        
        return True

    async def test_join_leave_room(self) -> bool:
        """Test joining and leaving rooms"""
        print_header("Testing Join/Leave Room")
        
        if not self.created_room_id:
            print_error("No room ID available")
            return False
        
        # Join room
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rooms/{self.created_room_id}/join?username={TEST_USERS[0]['username']}"
            ) as response:
                data = await response.json()
                if response.status == 200:
                    print_success(f"Joined room: {data.get('message')}")
                else:
                    print_error(f"Join room failed: {data}")
                    return False
        except Exception as e:
            print_error(f"Join room error: {e}")
            return False
        
        # Leave room
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rooms/{self.created_room_id}/leave?username={TEST_USERS[0]['username']}"
            ) as response:
                data = await response.json()
                if response.status == 200:
                    print_success(f"Left room: {data.get('message')}")
                else:
                    print_error(f"Leave room failed: {data}")
                    return False
        except Exception as e:
            print_error(f"Leave room error: {e}")
            return False
        
        return True

    async def test_room_messages(self) -> bool:
        """Test room messages"""
        print_header("Testing Room Messages")
        
        if not self.created_room_id:
            print_error("No room ID available")
            return False
        
        # Re-join room first
        await self.session.post(
            f"{BASE_URL}/api/rooms/{self.created_room_id}/join?username={TEST_USERS[0]['username']}"
        )
        
        # Send room message (room_id is required in body even though it's in path)
        message_data = {
            "room_id": self.created_room_id,
            "sender": TEST_USERS[0]["username"],
            "content": "Test message from automated test",
            "message_type": "TEXT"
        }
        
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rooms/{self.created_room_id}/messages",
                json=message_data
            ) as response:
                if response.status in [201, 200]:
                    message = await response.json()
                    print_success(f"Sent room message: {message.get('content')}")
                else:
                    text = await response.text()
                    print_error(f"Send room message failed (status {response.status}): {text}")
                    return False
        except Exception as e:
            print_error(f"Send room message error: {e}")
            return False
        
        # Get room messages
        try:
            async with self.session.get(
                f"{BASE_URL}/api/rooms/{self.created_room_id}/messages"
            ) as response:
                if response.status == 200:
                    messages = await response.json()
                    print_success(f"Get room messages: {len(messages)} messages")
                else:
                    print_error(f"Get room messages failed: {response.status}")
        except Exception as e:
            print_error(f"Get room messages error: {e}")
        
        return True

    async def test_private_messages(self) -> bool:
        """Test private messaging"""
        print_header("Testing Private Messages")
        
        # Send private message
        message_data = {
            "recipient": TEST_USERS[1]["username"],
            "content": "Test private message",
            "message_type": "TEXT"
        }
        
        try:
            async with self.session.post(
                f"{BASE_URL}/api/messages/send?username={TEST_USERS[0]['username']}",
                json=message_data
            ) as response:
                message = await response.json()
                if response.status in [200, 201]:
                    print_success(f"Sent private message: {message.get('content')}")
                else:
                    print_error(f"Send private message failed: {message}")
        except Exception as e:
            print_error(f"Send private message error: {e}")
        
        # Get private messages
        try:
            async with self.session.get(
                f"{BASE_URL}/api/messages/private/{TEST_USERS[0]['username']}?other_user={TEST_USERS[1]['username']}"
            ) as response:
                if response.status == 200:
                    messages = await response.json()
                    print_success(f"Get private messages: {len(messages)} messages")
                else:
                    print_error(f"Get private messages failed: {response.status}")
        except Exception as e:
            print_error(f"Get private messages error: {e}")
        
        # Get unread messages
        try:
            async with self.session.get(
                f"{BASE_URL}/api/messages/unread/{TEST_USERS[1]['username']}"
            ) as response:
                if response.status == 200:
                    messages = await response.json()
                    print_success(f"Get unread messages: {len(messages)} messages")
                else:
                    print_error(f"Get unread messages failed: {response.status}")
        except Exception as e:
            print_error(f"Get unread messages error: {e}")
        
        return True

    async def test_invitation_links(self) -> bool:
        """Test invitation link functionality"""
        print_header("Testing Invitation Links")
        
        if not self.created_room_id:
            print_error("No room ID available")
            return False
        
        # Create invitation link
        invite_data = {"expires_in_hours": 24}
        
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rooms/{self.created_room_id}/invite?username={TEST_USERS[0]['username']}",
                json=invite_data
            ) as response:
                invite = await response.json()
                if response.status == 201:
                    self.invite_code = invite.get("invite_code")
                    print_success(f"Created invitation link: {self.invite_code}")
                else:
                    print_error(f"Create invitation failed: {await response.json()}")
                    return False
        except Exception as e:
            print_error(f"Create invitation error: {e}")
            return False
        
        # Get invitation links
        try:
            async with self.session.get(
                f"{BASE_URL}/api/rooms/{self.created_room_id}/invites?username={TEST_USERS[0]['username']}"
            ) as response:
                if response.status == 200:
                    invites = await response.json()
                    print_success(f"Get invitation links: {len(invites)} links")
                else:
                    print_error(f"Get invitation links failed: {response.status}")
        except Exception as e:
            print_error(f"Get invitation links error: {e}")
        
        # Validate invitation link
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rooms/invite/validate?invite_code={self.invite_code}"
            ) as response:
                if response.status == 200:
                    print_success("Invitation link is valid")
                else:
                    print_error("Invitation link validation failed")
        except Exception as e:
            print_error(f"Validate invitation error: {e}")
        
        # Join via invitation link
        join_data = {
            "invite_code": self.invite_code,
            "username": TEST_USERS[1]["username"]
        }
        
        try:
            async with self.session.post(
                f"{BASE_URL}/api/rooms/invite/join",
                json=join_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    print_success(f"Joined via invitation: {data.get('message')}")
                else:
                    print_error(f"Join via invitation failed: {await response.json()}")
        except Exception as e:
            print_error(f"Join via invitation error: {e}")
        
        return True

    async def cleanup_test_data(self):
        """Xóa dữ liệu test từ lần chạy trước"""
        print_header("Cleaning Up Old Test Data")
        try:
            # Xóa test users
            for user in TEST_USERS:
                try:
                    async with self.session.delete(
                        f"{BASE_URL}/api/users/{user['username']}"
                    ) as response:
                        if response.status == 200:
                            print_success(f"Deleted user: {user['username']}")
                        elif response.status == 404:
                            print_info(f"User not found: {user['username']}")
                except Exception as e:
                    print_info(f"Could not delete user {user['username']}: {e}")
        except Exception as e:
            print_info(f"Cleanup error: {e}")

    async def run_all_tests(self):
        """Run all tests"""
        print_header("REALCHAT AUTOMATED TEST SUITE")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        await self.setup()
        await self.cleanup_test_data()
        
        # Run tests
        results = {
            "health_check": await self.test_health_check(),
            "registration": await self.test_auth_registration(),
            "login": await self.test_auth_login(),
            "user_management": await self.test_user_management(),
            "room_creation": await self.test_room_creation(),
            "room_management": await self.test_room_management(),
            "join_leave_room": await self.test_join_leave_room(),
            "room_messages": await self.test_room_messages(),
            "private_messages": await self.test_private_messages(),
            "invitation_links": await self.test_invitation_links(),
            "logout": await self.test_auth_logout(),
        }
        
        # Print summary
        print_header("TEST SUMMARY")
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        
        for test_name, result in results.items():
            if result:
                print_success(f"{test_name}: PASSED")
            else:
                print_error(f"{test_name}: FAILED")
        
        print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.ENDC}")
        
        await self.teardown()
        
        return all(results.values())


async def main():
    """Main entry point"""
    tester = RealChatTester()
    success = await tester.run_all_tests()
    
    if success:
        print_header("ALL TESTS PASSED ✓")
        sys.exit(0)
    else:
        print_header("SOME TESTS FAILED ✗")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

