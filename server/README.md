# FunDraw React

Ứng dụng game vẽ và đoán hình được chuyển đổi từ C# Windows Forms sang React.

## 📖 Quy Tắc Chơi

Xem file [GAME_RULES.md](./GAME_RULES.md) để biết chi tiết về quy tắc chơi và cách tính điểm.

## Cài đặt

```bash
npm install
```

## Chạy dự án

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## Build

```bash
npm run build
```

## Cấu hình

Tạo file `.env` từ `.env.example` và cấu hình:

```
VITE_API_HOST=http://localhost:3000
VITE_WS_HOST=http://localhost:3000
```

**Lưu ý:** 
- `VITE_WS_HOST` phải dùng `http://` hoặc `https://` (không dùng `ws://` hay `wss://`)
- Socket.IO client tự động chuyển đổi protocol và namespace `/game` được xử lý tự động

## Cấu trúc dự án

```
src/
├── components/     # UI components (PlayerCard, WordButton)
├── pages/          # Page components (Login, Register, MainMenu, etc.)
├── services/       # API, WebSocket, Auth services
├── store/          # Zustand state management
├── types/          # TypeScript types
└── config/         # Configuration files
```

## Tính năng

- ✅ Authentication (Login, Register, Forgot Password)
- ✅ Room Management (Create, Join)
- ✅ Real-time Drawing với Fabric.js
- ✅ WebSocket Communication
- ✅ Game State Management
- ✅ Chat System
- ✅ Scoring & Leaderboard

## Thay đổi so với C# version

1. **UI Framework**: Windows Forms → React + CSS
2. **Drawing**: SkiaSharp → Fabric.js
3. **Storage**: File-based → localStorage
4. **State**: Static classes → Zustand stores
5. **Navigation**: FormState → React Router
6. **WebSocket**: SocketIOClient → socket.io-client

Logic game giữ nguyên, tương thích với backend hiện tại.
