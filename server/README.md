# FunDraw API - Express.js

API backend cho game FunDraw, được chuyển đổi từ NestJS sang Express.js với hỗ trợ MySQL XAMPP.

## 📖 Quy Tắc Chơi

Xem file [GAME_RULES.md](./GAME_RULES.md) để biết chi tiết về quy tắc chơi và cách tính điểm.

## Yêu cầu

- Node.js >= 18
- MySQL (XAMPP) - Port 3306
- Redis - Port 6379

## Cài đặt

### 1. Cài đặt dependencies:
```bash
npm install
```

### 2. Tạo database trong MySQL XAMPP:

Mở phpMyAdmin hoặc MySQL command line và chạy:
```sql
CREATE DATABASE fundraw_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Cấu hình `.env`:

Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin MySQL XAMPP của bạn:
```env
# MySQL XAMPP - Mặc định: root user, không có password, port 3306
DATABASE_URL="mysql://root:@localhost:3306/fundraw_db?schema=public"

# Redis - Mặc định: localhost, port 6379
REDIS_URL="redis://localhost:6379"

# JWT Secrets - Thay đổi trong production
ACCESS_TOKEN_SECRET="your-secret-key-here"
REFRESH_TOKEN_SECRET="your-refresh-secret-key-here"

# Email (cho password reset) - Tùy chọn
MAIL_HOST="smtp.gmail.com"
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-app-password"
MAIL_SENDAS="your-email@gmail.com"
```

### 4. Chạy Prisma migrations:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (tạo bảng Users)
npm run prisma:migrate
```

Hoặc chạy SQL trực tiếp trong MySQL:
```sql
-- File: prisma/migrations/init/migration.sql
CREATE TABLE IF NOT EXISTS `Users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `avatar` VARCHAR(191) NULL,
    `accessToken` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(191) NULL,
    UNIQUE INDEX `Users_username_key`(`username`),
    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Chạy dự án

### Development (với hot reload):
```bash
npm run dev
```

### Production:
```bash
npm run build
npm start
```

Server sẽ chạy tại `http://localhost:3000`

## API Endpoints

### Auth
- `POST /auth/login` - Đăng nhập
  - Body: `{ username, password }`
  - Response: `{ statusCode, message, data: { user, accessToken } }`

- `POST /auth/register` - Đăng ký
  - Body: `{ username, password, confirm_password, email }`
  - Response: `{ statusCode, message, data: { user, accessToken } }`

- `POST /auth/logout` - Đăng xuất
  - Header: `Authorization: Bearer <token>`
  - Response: `{ statusCode, message }`

### Users
- `GET /users/profile` - Lấy thông tin user
  - Header: `Authorization: Bearer <token>`
  - Response: `{ statusCode, data: { user } }`

- `POST /users/change-password` - Đổi mật khẩu
  - Header: `Authorization: Bearer <token>`
  - Body: `{ password, confirm_password }`
  - Response: `{ statusCode, message, data: { accessToken } }`

- `POST /users/reset-password` - Gửi email reset password (không cần auth)
  - Body: `{ email }`
  - Response: `{ statusCode, message }`

- `POST /users/reset-otp` - Reset password với OTP (không cần auth)
  - Body: `{ email, otp, password, confirm_password }`
  - Response: `{ statusCode, message }`

### Health Check
- `GET /health` - Kiểm tra server status

## WebSocket (Socket.IO)

### Namespace: `/game`

### Connection:
```javascript
const socket = io('http://localhost:3000/game', {
  query: { token: 'your-access-token' },
  transports: ['websocket']
});
```

### Events:

#### Client → Server:
- `createRoom` - Tạo phòng mới
- `joinRoom` - Tham gia phòng `{ roomId }`
- `startGame` - Bắt đầu game `{ roomId, playersCount, drawTime, roundsCount, wordsCount, hintsCount }`
- `chooseWord` - Chọn từ `{ roomId, word }`
- `drawEvent` - Gửi drawing data `{ roomId, payload: { action, start, end, color } }`
- `chatMessage` - Gửi tin nhắn `{ roomId, message }`
- `playerList` - Lấy danh sách player `{ roomId }`
- `roomInfo` - Lấy thông tin phòng `{ roomId }`

#### Server → Client:
- `ping` - Ping từ server
- `roomCreated` - Phòng đã được tạo `{ room data }`
- `joinRoom` - Đã tham gia phòng `{ room data }`
- `startGame` - Game đã bắt đầu
- `chooseWord` - Chọn từ `{ drawer, words, timeLeft, round, totalRounds }`
- `gameProgress` - Tiến trình game `{ state, word, timeLeft, players }`
- `drawEvent` - Drawing data từ player khác
- `chatMessage` - Tin nhắn chat
- `chatGuessed` - Tin nhắn khi đoán đúng
- `playerList` - Danh sách players
- `roomInfo` - Thông tin phòng
- `roomClosed` - Phòng đã đóng
- `error` - Lỗi `{ error, message }`

## Cấu trúc dự án

```
FunDraw-API-Express/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── services/
│   │   ├── prisma.service.ts  # Database service
│   │   ├── redis.service.ts   # Redis service
│   │   ├── jwt.service.ts     # JWT token service
│   │   ├── mail.service.ts    # Email service
│   │   ├── auth.service.ts    # Authentication logic
│   │   └── users.service.ts   # User management logic
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   └── users.routes.ts   # User endpoints
│   ├── middleware/
│   │   └── auth.middleware.ts # Authentication middleware
│   ├── socket/
│   │   ├── game.gateway.ts    # Socket.IO gateway
│   │   ├── game.service.ts    # Game room management
│   │   ├── turn.service.ts    # Game turn logic
│   │   └── game.payload.ts   # Game types & word list
│   └── server.ts              # Main server file
├── prisma/
│   ├── schema.prisma          # Prisma schema
│   └── migrations/           # Database migrations
├── package.json
├── tsconfig.json
└── README.md
```

## Lưu ý quan trọng

1. **MySQL XAMPP**: 
   - Đảm bảo MySQL service đang chạy trong XAMPP
   - Mặc định: user `root`, không có password, port `3306`
   - Nếu có password, cập nhật trong `.env`: `mysql://root:password@localhost:3306/...`

2. **Redis**: 
   - Đảm bảo Redis đang chạy
   - Windows: Có thể dùng Redis for Windows hoặc WSL
   - Token được lưu trong Redis với TTL 15 phút (900 giây)

3. **Email Service**: 
   - Cần cấu hình để gửi email reset password
   - Gmail: Cần tạo App Password (không dùng mật khẩu thường)
   - Nếu không cần email, có thể bỏ qua

4. **Token Management**:
   - Access token được lưu trong Redis và Database
   - Token hết hạn sau 3 ngày (JWT) nhưng Redis TTL là 15 phút
   - Khi logout, token bị xóa khỏi Redis

## So sánh với NestJS version

- ✅ Giữ nguyên toàn bộ logic game
- ✅ Tương thích với React frontend
- ✅ Tương thích với MySQL XAMPP
- ✅ Đơn giản hơn, dễ maintain hơn
- ✅ Ít dependencies hơn
- ✅ Performance tương đương

## Troubleshooting

1. **Lỗi kết nối database**: 
   - Kiểm tra MySQL XAMPP đã chạy chưa
   - Kiểm tra `DATABASE_URL` trong `.env` đúng chưa
   - Kiểm tra database `fundraw_db` đã được tạo chưa

2. **Lỗi kết nối Redis**: 
   - Kiểm tra Redis đã chạy chưa
   - Kiểm tra `REDIS_URL` trong `.env` đúng chưa

3. **Lỗi Prisma**: 
   - Chạy `npm run prisma:generate` để generate Prisma Client
   - Chạy `npm run prisma:migrate` để tạo bảng

4. **Lỗi Socket.IO**: 
   - Kiểm tra token có hợp lệ không
   - Kiểm tra namespace `/game` có đúng không

