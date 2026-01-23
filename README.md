# 🎨 FunDraw - Game Vẽ và Đoán Từ Multiplayer

FunDraw là một game vẽ và đoán từ (Pictionary-style) cho nhiều người chơi, được xây dựng với React và Express.js. Người chơi lần lượt vẽ một từ và những người khác sẽ đoán từ đó trong thời gian giới hạn.

## 📋 Mục Lục

- [Tính Năng](#-tính-năng)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Cài Đặt](#-cài-đặt)
- [Cấu Hình](#-cấu-hình)
- [Chạy Dự Án](#-chạy-dự-án)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [API Documentation](#-api-documentation)
- [Quy Tắc Chơi](#-quy-tắc-chơi)
- [Troubleshooting](#-troubleshooting)

## ✨ Tính Năng

### Xác Thực Người Dùng
- ✅ Đăng ký tài khoản mới
- ✅ Đăng nhập/Đăng xuất
- ✅ Quên mật khẩu (gửi OTP qua email)
- ✅ Đổi mật khẩu
- ✅ Quản lý profile người dùng

### Game Multiplayer
- ✅ Tạo phòng game và tham gia phòng
- ✅ Hỗ trợ tối đa 8 người chơi
- ✅ Vẽ real-time trên canvas với Fabric.js
- ✅ Chat real-time giữa các người chơi
- ✅ Hệ thống tính điểm tự động
- ✅ Bảng xếp hạng (Leaderboard)
- ✅ Gợi ý từ (hints) tự động
- ✅ Khôi phục canvas khi reload trang

### Tính Năng Đặc Biệt
- ✅ WebSocket real-time communication
- ✅ Tab isolation - mỗi tab hoạt động độc lập
- ✅ Chat riêng cho người đã đoán đúng
- ✅ Tự động chọn từ nếu không chọn trong thời gian quy định
- ✅ Giảm thời gian khi có người đoán đúng

## 🛠 Công Nghệ Sử Dụng

### Frontend (Client)
- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool và dev server
- **Fabric.js** - Canvas drawing library
- **Socket.IO Client** - Real-time communication
- **Zustand** - State management
- **React Router** - Routing
- **Axios** - HTTP client

### Backend (Server)
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Socket.IO** - WebSocket server
- **Prisma** - ORM cho database
- **MySQL** - Database (hỗ trợ XAMPP)
- **Redis** - Caching và session management
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Nodemailer** - Email service

## 📦 Yêu Cầu Hệ Thống

- **Node.js** >= 18
- **MySQL** (XAMPP hoặc MySQL Server) - Port 3306
- **Redis** - Port 6379
- **npm** hoặc **yarn**

## 🚀 Cài Đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd CK
```

### 2. Cài đặt dependencies cho Client

```bash
cd client
npm install
```

### 3. Cài đặt dependencies cho Server

```bash
cd ../server
npm install
```

### 4. Tạo Database

Mở MySQL (XAMPP hoặc MySQL Server) và tạo database:

```sql
CREATE DATABASE fundraw_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Chạy Prisma Migrations

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

Hoặc chạy SQL trực tiếp trong MySQL (xem file `server/prisma/migrations/init/migration.sql`)

## ⚙️ Cấu Hình

### Server Configuration

Tạo file `.env` trong thư mục `server/`:

```env
# Database
DATABASE_URL="mysql://root:@localhost:3306/fundraw_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (thay đổi trong production)
ACCESS_TOKEN_SECRET="your-secret-key-here"
REFRESH_TOKEN_SECRET="your-refresh-secret-key-here"

# Email (cho password reset) - Tùy chọn
MAIL_HOST="smtp.gmail.com"
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-app-password"
MAIL_SENDAS="your-email@gmail.com"

# Server Port
PORT=3000
```

**Lưu ý:**
- Nếu MySQL có password, cập nhật `DATABASE_URL`: `mysql://root:password@localhost:3306/...`
- Gmail cần tạo App Password (không dùng mật khẩu thường)

### Client Configuration

Tạo file `.env` trong thư mục `client/`:

```env
VITE_API_HOST=http://localhost:3000
VITE_WS_HOST=http://localhost:3000
```

**Lưu ý:**
- `VITE_WS_HOST` phải dùng `http://` hoặc `https://` (không dùng `ws://` hay `wss://`)
- Socket.IO client tự động chuyển đổi protocol

## 🎮 Chạy Dự Án

### Development Mode

#### 1. Chạy Server

```bash
cd server
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

#### 2. Chạy Client (terminal mới)

```bash
cd client
npm run dev
```

Client sẽ chạy tại `http://localhost:5173`

### Production Mode

#### Build và chạy Server

```bash
cd server
npm run build
npm start
```

#### Build và chạy Client

```bash
cd client
npm run build
npm run preview
```

## 📁 Cấu Trúc Dự Án

```
CK/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # UI Components
│   │   │   ├── CanvasDraw.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   └── WordButton.tsx
│   │   ├── pages/          # Page Components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── MainMenu.tsx
│   │   │   ├── HostRoom.tsx
│   │   │   ├── WaitingRoom.tsx
│   │   │   └── GameRoom.tsx
│   │   ├── services/       # API & WebSocket Services
│   │   │   ├── apiClient.ts
│   │   │   ├── authService.ts
│   │   │   ├── websocketService.ts
│   │   │   └── storage.ts
│   │   ├── store/          # Zustand State Management
│   │   │   ├── authStore.ts
│   │   │   └── gameStore.ts
│   │   ├── types/          # TypeScript Types
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utility Functions
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Backend Express.js API
│   ├── src/
│   │   ├── config/         # Environment Config
│   │   ├── services/       # Business Logic Services
│   │   │   ├── prisma.service.ts
│   │   │   ├── redis.service.ts
│   │   │   ├── jwt.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── users.service.ts
│   │   ├── routes/         # API Routes
│   │   │   ├── auth.routes.ts
│   │   │   └── users.routes.ts
│   │   ├── middleware/     # Express Middleware
│   │   │   └── auth.middleware.ts
│   │   ├── socket/         # Socket.IO Handlers
│   │   │   ├── game.gateway.ts
│   │   │   ├── game.service.ts
│   │   │   ├── turn.service.ts
│   │   │   └── game.payload.ts
│   │   └── server.ts       # Main Server File
│   ├── prisma/
│   │   ├── schema.prisma   # Database Schema
│   │   └── migrations/     # Database Migrations
│   └── package.json
│
├── client/GAME_RULES.md    # Quy tắc chơi (Client)
├── server/GAME_RULES.md    # Quy tắc chơi (Server)
└── README.md               # File này
```

## 📡 API Documentation

### Authentication Endpoints

#### `POST /auth/login`
Đăng nhập người dùng

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "string"
  }
}
```

#### `POST /auth/register`
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "confirm_password": "string",
  "email": "string"
}
```

#### `POST /auth/logout`
Đăng xuất (cần authentication)

**Headers:**
```
Authorization: Bearer <accessToken>
```

### User Endpoints

#### `GET /users/profile`
Lấy thông tin profile (cần authentication)

#### `POST /users/change-password`
Đổi mật khẩu (cần authentication)

#### `POST /users/reset-password`
Gửi email reset password (không cần authentication)

#### `POST /users/reset-otp`
Reset password với OTP (không cần authentication)

### Health Check

#### `GET /health`
Kiểm tra server status

## 🎯 WebSocket Events

### Namespace: `/game`

### Client → Server Events

- `createRoom` - Tạo phòng mới
- `joinRoom` - Tham gia phòng `{ roomId }`
- `startGame` - Bắt đầu game
- `chooseWord` - Chọn từ `{ roomId, word }`
- `drawEvent` - Gửi drawing data
- `chatMessage` - Gửi tin nhắn `{ roomId, message }`
- `playerList` - Lấy danh sách player
- `roomInfo` - Lấy thông tin phòng

### Server → Client Events

- `ping` - Ping từ server
- `roomCreated` - Phòng đã được tạo
- `joinRoom` - Đã tham gia phòng
- `startGame` - Game đã bắt đầu
- `chooseWord` - Chọn từ
- `gameProgress` - Tiến trình game
- `drawEvent` - Drawing data từ player khác
- `chatMessage` - Tin nhắn chat
- `chatGuessed` - Tin nhắn khi đoán đúng
- `playerList` - Danh sách players
- `roomInfo` - Thông tin phòng
- `roomClosed` - Phòng đã đóng
- `error` - Lỗi

Xem chi tiết trong `server/README.md`

## 📖 Quy Tắc Chơi

Xem file [GAME_RULES.md](./client/GAME_RULES.md) hoặc [server/GAME_RULES.md](./server/GAME_RULES.md) để biết chi tiết về:

- Quy tắc chơi
- Cách tính điểm
- Vai trò người chơi (Drawer/Guesser)
- Tính năng đặc biệt
- Mẹo chơi

### Tóm Tắt Nhanh

1. **Thiết lập**: Tạo/Tham gia phòng → Chọn từ → Vẽ và Đoán
2. **Vẽ**: Người vẽ có 120 giây để vẽ từ đã chọn
3. **Đoán**: Người khác đoán từ qua chat
4. **Điểm**: Điểm = số giây còn lại (người đoán) hoặc số giây còn lại / 2 (người vẽ)
5. **Thắng**: Người có tổng điểm cao nhất sau tất cả rounds

## 🔧 Troubleshooting

### Lỗi kết nối Database

- ✅ Kiểm tra MySQL đã chạy chưa (XAMPP Control Panel)
- ✅ Kiểm tra `DATABASE_URL` trong `.env` đúng chưa
- ✅ Kiểm tra database `fundraw_db` đã được tạo chưa
- ✅ Kiểm tra user/password MySQL có đúng không

### Lỗi kết nối Redis

- ✅ Kiểm tra Redis đã chạy chưa
- ✅ Kiểm tra `REDIS_URL` trong `.env` đúng chưa
- ✅ Windows: Có thể dùng Redis for Windows hoặc WSL
- ⚠️ **Lưu ý**: Redis là optional, hệ thống sẽ fallback về database nếu Redis không khả dụng

### Lỗi Prisma

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

### Lỗi Socket.IO

- ✅ Kiểm tra token có hợp lệ không
- ✅ Kiểm tra namespace `/game` có đúng không
- ✅ Kiểm tra CORS settings trong server

### Lỗi Build Client

```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Lỗi Email Service

- ✅ Gmail: Cần tạo App Password (không dùng mật khẩu thường)
- ✅ Kiểm tra `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS` trong `.env`
- ⚠️ Email service là optional, có thể bỏ qua nếu không cần reset password

## 📝 Lưu Ý Quan Trọng

1. **MySQL XAMPP**: 
   - Mặc định: user `root`, không có password, port `3306`
   - Nếu có password, cập nhật trong `.env`

2. **Redis**: 
   - Token được lưu trong Redis với TTL 15 phút
   - Nếu Redis không khả dụng, hệ thống sẽ fallback về database

3. **Token Management**:
   - Access token hết hạn sau 3 ngày (JWT)
   - Redis TTL là 15 phút
   - Khi logout, token bị xóa khỏi Redis

4. **Tab Isolation**:
   - Mỗi tab trình duyệt hoạt động độc lập
   - Có thể mở nhiều tab với các tài khoản khác nhau

5. **Canvas Recovery**:
   - Canvas được lưu trên server
   - Tự động khôi phục khi reload trang

## 👥 Tác Giả

**Group 8 - Lap Trinh Mang**

## 📄 License

UNLICENSED

---

**Chúc bạn chơi vui vẻ! 🎨🎮**

