# Frontend - RealChat Vue.js 3

## Cấu trúc dự án

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.js       # Axios client setup
│   │   └── index.js        # API functions
│   ├── store/
│   │   ├── auth.js         # Auth state management
│   │   └── chat.js         # Chat state management
│   ├── views/
│   │   ├── LoginView.vue   # Login & Register
│   │   └── ChatView.vue    # Main chat interface
│   ├── router/
│   │   └── index.js        # Vue Router config
│   ├── App.vue             # Root component
│   └── main.js             # Entry point
├── index.html              # HTML template
├── vite.config.js          # Vite config
└── package.json            # Dependencies
```

## Cài đặt

```bash
cd frontend
npm install
```

## Chạy phát triển

```bash
npm run dev
```

Truy cập http://localhost:5173

## Build cho production

```bash
npm run build
npm run preview
```

## Tính năng

- ✅ Đăng ký & Đăng nhập
- ✅ Chat 1-1 với người dùng khác
- ✅ Tạo & Quản lý Phòng chat
- ✅ Lịch sử tin nhắn
- ✅ Trạng thái Online/Offline
- ✅ WebSocket Real-time (Sắp tới)
- ✅ Chia sẻ file (Sắp tới)

## Dependencies

- **Vue 3** - Progressive JavaScript framework
- **Vue Router 4** - Client-side routing
- **Pinia** - State management
- **Ant Design Vue** - Enterprise UI components
- **Axios** - HTTP client
- **Vite** - Modern frontend build tool
