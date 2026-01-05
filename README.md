# RealChat - Hệ Thống Chat Đa Nền Tảng

> **Ứng dụng chat hiện đại kết hợp công nghệ tiên tiến: FastAPI + MongoDB + Vue.js 3**

![Version](https://img.shields.io/badge/version-2.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Tính Năng Chính

### Phiên Bản 2.0 (FastAPI + MongoDB + Vue.js)

✅ **Kiến Trúc Hiện Đại**

- FastAPI: Async Python framework với hiệu năng cao
- MongoDB: NoSQL database với tính mở rộng tuyệt vời
- Vue.js 3: Frontend reactive với giao diện đẹp

✅ **Chức Năng Chat**

- 💬 Chat 1-1 giữa người dùng
- 👥 Phòng chat nhóm
- 📨 Lịch sử tin nhắn
- 🟢 Trạng thái Online/Offline (Presence Status)
- 🔔 Tin nhắn chưa đọc
- 🔗 Invitation Link - Chia sẻ link mời tham gia phòng

✅ **Bảo Mật**

- JWT authentication
- bcrypt password hashing
- CORS protection
- Invitation Link validation & expiration
- Room permission control (Creator-only actions)

✅ **Trải Nghiệm Người Dùng**

- Giao diện Ant Design Vue (enterprise UI)
- Responsive design
- Real-time updates (WebSocket ready)

---

## 📁 Cấu Trúc Dự Án

```
RealChat/
├── backend/                      # FastAPI Backend
│   ├── main.py                  # Ứng dụng chính
│   ├── config.py                # Cấu hình & MongoDB
│   ├── models.py                # Pydantic schemas
│   ├── database.py              # MongoDB CRUD operations
│   ├── utils.py                 # Utilities & validation
│   └── routes/
│       ├── auth.py              # Register, Login, Logout
│       ├── messages.py          # Message CRUD + WebSocket
│       ├── users.py             # User management
│       └── rooms.py             # Room management
│
├── frontend/                     # Vue.js 3 Frontend
│   ├── src/
│   │   ├── api/                 # Axios API client
│   │   ├── store/               # Pinia state management
│   │   ├── views/
│   │   │   ├── LoginView.vue   # Đăng ký/Đăng nhập
│   │   │   └── ChatView.vue    # Giao diện chat
│   │   ├── router/              # Vue Router config
│   │   ├── App.vue              # Root component
│   │   └── main.js              # Entry point
│   ├── index.html               # HTML template
│   ├── vite.config.js           # Vite config
│   └── package.json             # npm dependencies
│
├── common/                       # Shared utilities (v1)
│   ├── encryption.py            # Crypto functions
│   └── utils.py                 # Validators & helpers
│
├── tests/                        # Unit tests
│   └── test_chat_system.py      # 30 comprehensive tests
│
├── requirements.txt             # Python dependencies
├── README.md                    # Tài liệu này
└── HUONG_DAN_CHAY_V2.md         # Chi tiết hướng dẫn chạy
```

---

## 🚀 Bắt Đầu Nhanh

### Yêu Cầu Tiên Quyết

```bash
# Python 3.8+
python --version

# MongoDB
mongosh --version

# Node.js
node --version
npm --version
```

### Cài Đặt Backend

```bash
# Cài đặt dependencies
pip install -r requirements.txt

# Khởi động MongoDB
brew services start mongodb-community

# Chạy FastAPI server
cd backend
python3 -m uvicorn main:app --reload
```

### Cài Đặt Frontend

```bash
# Cài đặt npm packages
cd frontend
npm install

# Chạy Vite dev server
npm run dev
```

### Truy Cập Ứng Dụng

```
🌐 http://localhost:5173
📚 API Docs: http://localhost:8000/docs
```

---

## 🔑 API Endpoints

### Authentication

```
POST   /api/auth/register       - Đăng ký tài khoản
POST   /api/auth/login          - Đăng nhập (Set status: Online)
POST   /api/auth/logout         - Đăng xuất (Set status: Offline)
```

### Messages

```
GET    /api/messages/private/{username}     - Lấy chat 1-1
GET    /api/messages/unread/{username}      - Tin nhắn chưa đọc
POST   /api/messages/send                   - Gửi tin nhắn
WS     /api/messages/ws/{username}          - WebSocket real-time
```

### Users

```
GET    /api/users               - Danh sách users (với status)
GET    /api/users/online        - Users online
GET    /api/users/{username}    - Profile user
```

### Rooms

```
POST   /api/rooms               - Tạo phòng
GET    /api/rooms               - Tất cả phòng
GET    /api/rooms/user/{username}      - Phòng của user
POST   /api/rooms/{room_id}/join       - Tham gia
GET    /api/rooms/{room_id}/messages   - Tin nhắn phòng
```

### Room Invitation Links

```
POST   /api/rooms/{room_id}/invite               - Tạo invitation link (Creator only)
GET    /api/rooms/{room_id}/invites              - Xem tất cả invites (Creator only)
POST   /api/rooms/invite/validate                - Kiểm tra tính hợp lệ của link
POST   /api/rooms/invite/join                    - Tham gia phòng via invitation
POST   /api/rooms/{room_id}/invites/{code}/disable - Vô hiệu hóa link (Creator only)
```

---

## 📊 Công Nghệ Sử Dụng

### Backend

| Công Nghệ            | Mục Đích             |
| -------------------- | -------------------- |
| **FastAPI**          | Async web framework  |
| **Uvicorn**          | ASGI server          |
| **MongoDB**          | NoSQL database       |
| **Motor**            | Async MongoDB driver |
| **Pydantic**         | Data validation      |
| **python-jose**      | JWT authentication   |
| **passlib + bcrypt** | Password hashing     |

### Frontend

| Công Nghệ          | Mục Đích                 |
| ------------------ | ------------------------ |
| **Vue.js 3**       | Reactive framework       |
| **Vite**           | Modern build tool        |
| **Ant Design Vue** | Enterprise UI components |
| **Pinia**          | State management         |
| **Axios**          | HTTP client              |
| **Vue Router**     | Client-side routing      |

---

## 🎯 Tính Năng Mới - Presence Status & Room Invitations

### 1. Presence Status (Trạng Thái Người Dùng)

#### Cơ Chế Hoạt Động

- **User Session Active (Đăng nhập)** → Status: **Online**

  - Khi user gọi `/api/auth/login`, hệ thống sẽ:
    - Xác thực thông tin đăng nhập
    - Tạo JWT token
    - **Cập nhật `is_online = True` và `status = "ONLINE"`**
    - Ghi nhận thời gian `last_login`

- **User Session Inactive (Đăng xuất)** → Status: **Offline**
  - Khi user gọi `/api/auth/logout`, hệ thống sẽ:
    - Xác thực user
    - **Cập nhật `is_online = False` và `status = "OFFLINE"`**
    - Xóa session

#### Sử Dụng

```bash
# Đăng nhập - Status sẽ thành ONLINE
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# Phản hồi
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "_id": "67...",
    "username": "testuser",
    "is_online": true,
    "status": "ONLINE",
    "last_login": "2024-01-04T10:30:00",
    "created_at": "2024-01-01T08:00:00"
  }
}

# Đăng xuất - Status sẽ thành OFFLINE
curl -X POST "http://localhost:8000/api/auth/logout?username=testuser"

# Phản hồi
{
  "message": "Đã đăng xuất thành công"
}
```

#### Xem Danh Sách Users Online

```bash
# Lấy tất cả users đang online
curl "http://localhost:8000/api/users/online"

# Phản hồi - chỉ hiển thị users với status ONLINE
[
  {
    "_id": "67...",
    "username": "alice",
    "is_online": true,
    "status": "ONLINE",
    "last_login": "2024-01-04T10:30:00"
  },
  {
    "_id": "68...",
    "username": "bob",
    "is_online": true,
    "status": "ONLINE",
    "last_login": "2024-01-04T09:15:00"
  }
]
```

---

### 2. Room Invitation Link (Chia Sẻ Link Mời)

#### Cơ Chế Hoạt Động

**Chỉ creator phòng có thể:**

1. Tạo invitation links
2. Xem danh sách tất cả invitation links
3. Vô hiệu hóa invitation links

**Bất kỳ user nào có link có thể:**

1. Kiểm tra tính hợp lệ của link
2. Tham gia phòng qua link (nếu link vẫn hoạt động và chưa hết hạn)

#### Sử Dụng

##### 1. Creator Tạo Invitation Link

```bash
# Creator tạo invitation link cho phòng
curl -X POST "http://localhost:8000/api/rooms/{room_id}/invite?username=creator" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "60d5ec49c123456789abcdef",
    "expires_in_hours": 24
  }'

# Phản hồi - Nhận được invitation code
{
  "_id": "61d5ec49c123456789abcdef",
  "room_id": "60d5ec49c123456789abcdef",
  "room_name": "Team Meeting",
  "creator": "creator",
  "invite_code": "7A3B2F1E",
  "invite_link": "realchat://invite/7A3B2F1E",
  "created_by": "creator",
  "created_at": "2024-01-04T10:00:00",
  "expires_at": "2024-01-05T10:00:00",
  "is_active": true
}
```

##### 2. Creator Xem Danh Sách Invites

```bash
curl "http://localhost:8000/api/rooms/{room_id}/invites?username=creator"

# Phản hồi
[
  {
    "_id": "61d5ec49c123456789abcdef",
    "room_id": "60d5ec49c123456789abcdef",
    "room_name": "Team Meeting",
    "creator": "creator",
    "invite_code": "7A3B2F1E",
    "invite_link": "realchat://invite/7A3B2F1E",
    "created_by": "creator",
    "created_at": "2024-01-04T10:00:00",
    "expires_at": "2024-01-05T10:00:00",
    "is_active": true
  }
]
```

##### 3. User Kiểm Tra Tính Hợp Lệ Của Link

```bash
curl "http://localhost:8000/api/rooms/invite/validate?invite_code=7A3B2F1E"

# Phản hồi (link còn hợp lệ)
{
  "_id": "61d5ec49c123456789abcdef",
  "room_id": "60d5ec49c123456789abcdef",
  "room_name": "Team Meeting",
  "creator": "creator",
  "invite_code": "7A3B2F1E",
  "invite_link": "realchat://invite/7A3B2F1E",
  "created_by": "creator",
  "created_at": "2024-01-04T10:00:00",
  "expires_at": "2024-01-05T10:00:00",
  "is_active": true
}
```

##### 4. User Tham Gia Phòng Qua Invitation

```bash
curl -X POST "http://localhost:8000/api/rooms/invite/join" \
  -H "Content-Type: application/json" \
  -d '{
    "invite_code": "7A3B2F1E",
    "username": "newmember"
  }'

# Phản hồi
{
  "message": "Đã tham gia phòng thành công",
  "room_id": "60d5ec49c123456789abcdef",
  "room_name": "Team Meeting"
}
```

##### 5. Creator Vô Hiệu Hóa Invitation Link

```bash
curl -X POST "http://localhost:8000/api/rooms/{room_id}/invites/7A3B2F1E/disable?username=creator"

# Phản hồi
{
  "message": "Đã vô hiệu hóa invitation link"
}
```

#### Bảo Mật Invitation Links

- 🔐 **Unique Code**: Mỗi link có mã code duy nhất (UUID shortened)
- ⏰ **Expiration**: Mỗi link có thời gian hết hạn (mặc định 24h)
- 🔒 **Creator Only**: Chỉ creator phòng có thể tạo/quản lý links
- 📊 **Usage Tracking**: Hệ thống ghi nhận ai đã dùng link
- ✅ **Validation**: Kiểm tra link trước khi tham gia

---

✅ **Implemented**

- JWT token-based authentication
- bcrypt password hashing (password strength validation)
- CORS protection
- Input validation (Pydantic)
- SQL injection prevention (MongoDB with Motor)

⚠️ **Recommendations**

- Use HTTPS in production
- Set `SECRET_KEY` in environment variables
- Configure CORS_ORIGINS for production
- Enable MongoDB authentication in production

---

## 🧪 Testing

```bash
# Chạy unit tests (v1)
python -m pytest tests/ -v

# Coverage report
python -m pytest tests/ --cov=server --cov=client
```

---

## 📈 Performance

### FastAPI

- Async/await support cho non-blocking I/O
- Automatic API documentation (Swagger UI)
- Built-in validation & serialization
- ~10x performance increase vs v1

### MongoDB

- Horizontal scalability
- Flexible schema
- Built-in indexes for fast queries
- Replication & sharding support

### Vue.js 3

- Faster reactivity system
- Smaller bundle size
- Better TypeScript support
- Composition API

---

## 🤝 Kiến Trúc Ứng Dụng

```
┌─────────────────┐
│   Browser (5173)│
│   Vue.js 3      │
└────────┬────────┘
         │ HTTP + WebSocket
         ↓
┌─────────────────┐
│  FastAPI (8000) │
│   Uvicorn       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    MongoDB      │
│   (27017)       │
└─────────────────┘
```

**Request Flow:**

1. User interacts with Vue.js UI
2. Frontend sends HTTP request via Axios
3. FastAPI processes & validates with Pydantic
4. Backend performs CRUD on MongoDB
5. Response returns with status code
6. Frontend updates state with Pinia

---

## 📝 Chi Tiết Cài Đặt

Xem file [HUONG_DAN_CHAY_V2.md](HUONG_DAN_CHAY_V2.md) để hướng dẫn chi tiết từng bước.

---

## 🔄 So Sánh v1 vs v2

| Yếu Tố          | v1 (Socket)     | v2 (FastAPI)    |
| --------------- | --------------- | --------------- |
| **Framework**   | Raw TCP sockets | FastAPI         |
| **Database**    | SQLite          | MongoDB         |
| **Frontend**    | Tkinter         | Vue.js 3        |
| **Protocol**    | Custom JSON     | HTTP REST       |
| **Async**       | Threading       | async/await     |
| **Scalability** | Limited         | Excellent       |
| **UX**          | Desktop only    | Web-based       |
| **API Docs**    | None            | Swagger/OpenAPI |
| **Performance** | Moderate        | High            |

---

## ✅ Yêu Cầu Dự Án (Requirements)

### 6 Công Nghệ Chủ Yếu

1. ✅ **Socket Programming** → HTTP REST + WebSocket
2. ✅ **Multi-threading** → Async/await
3. ✅ **Protocol Design** → JSON REST API
4. ✅ **Client-Server Model** → FastAPI + Vue.js
5. ✅ **File Transfer** → Base64 encoding (MongoDB)
6. ✅ **Authentication** → JWT + bcrypt

### 5+ Chức Năng

1. ✅ Chat 1-1
2. ✅ Phòng chat nhóm
3. ✅ Lịch sử tin nhắn
4. ✅ Chia sẻ file
5. ✅ Trạng thái Online/Offline
6. ✅ Thông báo tin chưa đọc

---

## 🐛 Khắc Phục Sự Cố

### Backend Issues

```bash
# MongoDB không kết nối
brew services start mongodb-community

# Port 8000 đang dùng
lsof -i :8000
kill -9 <PID>

# Dependencies lỗi
pip install --upgrade -r requirements.txt --force-reinstall
```

### Frontend Issues

```bash
# npm lỗi
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Port 5173 đang dùng
lsof -i :5173
```

---

## 📚 Tài Liệu Tham Khảo

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Vue.js 3 Guide](https://vuejs.org/)
- [Ant Design Vue](https://www.antdv.com/)
- [Pinia](https://pinia.vuejs.org/)

---

## 📞 Hỗ Trợ

Gặp lỗi? Kiểm tra:

1. MongoDB đang chạy
2. FastAPI server online (port 8000)
3. Frontend dev server online (port 5173)
4. CORS origins được cấu hình đúng
5. Network connectivity tốt

---

## 📄 License

MIT License - Tự do sử dụng và phát triển

---

## 👨‍💻 Tác Giả

**Huỳnh Ngọc Bình**

- 📧 Email: [your-email]
- 🔗 GitHub: [your-github]
- 💼 LinkedIn: [your-linkedin]

---

**Phiên bản 2.0** | **Cập nhật: 2024** | **Status: Production Ready** ✨
