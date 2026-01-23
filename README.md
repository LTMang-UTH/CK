# 🎮 Game Tic-Tac-Toe (Caro 3x3) - Multiplayer Online

Game Cờ Caro 3x3 online đa người chơi được xây dựng với kiến trúc Client-Server sử dụng WebSocket để giao tiếp real-time.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Giao thức WebSocket](#-giao-thức-websocket)
- [Lưu ý](#-lưu-ý)
- [Troubleshooting](#-troubleshooting)

## ✨ Tính năng

### 🎯 Tính năng chính

- **Đăng ký/Đăng nhập**: Hệ thống quản lý tài khoản người dùng
- **Chơi game online**: Chơi Cờ Caro 3x3 với người chơi khác qua mạng
- **Thách đấu**: Gửi lời thách đấu đến người chơi online khác
- **Tự động ghép cặp**: Hệ thống tự động ghép cặp với người chơi đang chờ
- **Lịch sử đấu**: Xem lịch sử các ván đấu đã chơi
- **Bảng xếp hạng**: Xem bảng xếp hạng người chơi theo số trận thắng
- **Danh sách người chơi online**: Xem danh sách người chơi đang online và trạng thái của họ
- **Real-time communication**: Giao tiếp real-time sử dụng WebSocket
- **Đếm ngược thời gian**: Mỗi lượt có 30 giây để đánh
- **Hiệu ứng âm thanh**: Phát nhạc khi bắt đầu ván đấu mới

### 🎮 Luật chơi

- Bàn cờ 3x3
- Người chơi X đi trước, người chơi O đi sau
- Thắng khi có 3 quân liên tiếp (ngang, dọc, hoặc chéo)
- Hòa khi bàn cờ đầy và không có người thắng
- Mỗi lượt có 30 giây để đánh

## 💻 Yêu cầu hệ thống

- **Node.js**: Phiên bản 14.x trở lên
- **npm**: Đi kèm với Node.js
- **Trình duyệt**: Chrome, Firefox, Edge, Safari (phiên bản mới nhất)
- **Hệ điều hành**: Windows, macOS, hoặc Linux

## 🚀 Cài đặt

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd GK
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

Lệnh này sẽ cài đặt các package cần thiết:
- `ws`: Thư viện WebSocket cho Node.js

## 📖 Hướng dẫn sử dụng

### Chạy ứng dụng

Ứng dụng cần chạy **2 server** đồng thời:

#### 1. Chạy WebSocket Server (Terminal 1)

```bash
npm start
```

Hoặc:

```bash
node server/serverMain.js
```

Server sẽ chạy trên port **12345** (WebSocket) và hiển thị:
```
Server started on port 12345...
```

#### 2. Chạy HTTP Server (Terminal 2)

Mở một terminal/cửa sổ mới và chạy:

```bash
npm run http
```

Hoặc:

```bash
node server/httpServer.js
```

Server sẽ chạy trên port **8000** (HTTP) và hiển thị:
```
HTTP Server running at http://localhost:8000/
Serving files from: <path-to-client>
```

#### 3. Truy cập ứng dụng

- Mở trình duyệt và truy cập: `http://localhost:8000`
- **Lưu ý**: Đảm bảo cả 2 server đều đang chạy trước khi truy cập

### Sử dụng ứng dụng

1. **Đăng ký tài khoản mới**:
   - Click nút "Đăng ký" trên trang đăng nhập
   - Nhập tên đăng nhập và mật khẩu (tối thiểu 3 ký tự)
   - Xác nhận mật khẩu và click "Đăng ký"

2. **Đăng nhập**:
   - Nhập tên đăng nhập và mật khẩu
   - Click "Đăng nhập" hoặc nhấn Enter

3. **Chơi game**:
   - **Thách đấu**: Chọn người chơi từ danh sách online và click để thách đấu
   - **Tự động ghép cặp**: Click nút "Tự động ghép cặp" để hệ thống tự động tìm đối thủ
   - **Đánh cờ**: Click vào ô trống trên bàn cờ khi đến lượt bạn
   - **Chơi lại**: Click nút "Chơi lại" để bắt đầu ván mới
   - **Ngừng chơi**: Click nút "Ngừng chơi" để thoát khỏi ván đấu

4. **Xem lịch sử và xếp hạng**:
   - Click "Lịch sử đấu" để xem các ván đấu đã chơi
   - Click "Bảng xếp hạng" để xem bảng xếp hạng người chơi

## 📁 Cấu trúc dự án

```
GK/
├── server/                 # Server-side code
│   ├── data/              # Thư mục lưu trữ dữ liệu
│   │   └── accounts.txt   # File lưu thông tin tài khoản (tự động tạo)
│   ├── accountManager.js  # Quản lý tài khoản (đăng ký, đăng nhập)
│   ├── gameRoom.js        # Logic phòng game (xử lý game logic)
│   ├── httpServer.js      # HTTP server (phục vụ file tĩnh)
│   ├── matchHistory.js    # Lịch sử đấu (lưu và truy xuất lịch sử)
│   └── serverMain.js      # Server chính (WebSocket server)
│
├── client/                 # Client-side code
│   ├── pages/             # Các trang HTML
│   │   ├── login.html     # Trang đăng nhập
│   │   ├── register.html  # Trang đăng ký
│   │   ├── game.html      # Trang chơi game
│   │   ├── history.html   # Trang lịch sử đấu
│   │   └── ranking.html   # Trang bảng xếp hạng
│   ├── js/                # JavaScript files
│   │   ├── utils.js       # Các hàm tiện ích (WebSocket, session, ...)
│   │   ├── login.js       # Logic đăng nhập
│   │   ├── register.js    # Logic đăng ký
│   │   ├── game.js         # Logic game chính
│   │   ├── history.js      # Logic lịch sử đấu
│   │   └── ranking.js      # Logic bảng xếp hạng
│   ├── css/               # Stylesheets
│   │   ├── main.css       # CSS chung
│   │   ├── game.css       # CSS cho trang game
│   │   └── tables.css     # CSS cho bảng (history, ranking)
│   ├── mp3/               # Audio files
│   │   └── snaptik.vn_hs4CR.mp3  # Nhạc khi bắt đầu ván đấu
│   └── index.html         # Trang chủ (redirect đến login)
│
├── node_modules/          # Dependencies (tự động tạo sau npm install)
│
├── package.json           # File cấu hình npm
├── package-lock.json     # File khóa phiên bản dependencies
├── .gitignore            # Git ignore rules
└── README.md             # File này
```

## 🛠 Công nghệ sử dụng

### Backend
- **Node.js**: Runtime environment
- **WebSocket (ws)**: Giao tiếp real-time giữa client và server
- **HTTP Server**: Phục vụ file tĩnh (HTML, CSS, JS)

### Frontend
- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling và animation
- **Vanilla JavaScript**: Logic phía client
- **WebSocket API**: Kết nối real-time với server

### Kiến trúc
- **Client-Server Architecture**: Tách biệt client và server
- **WebSocket Protocol**: Giao tiếp hai chiều real-time
- **Session Management**: Quản lý phiên đăng nhập bằng sessionStorage

## 📡 Giao thức WebSocket

### Client → Server

| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `LOGIN:username:password` | Đăng nhập | `LOGIN:player1:pass123` |
| `REGISTER:username:password` | Đăng ký | `REGISTER:newuser:pass123` |
| `CHALLENGE:username` | Thách đấu người chơi | `CHALLENGE:player2` |
| `ACCEPT_CHALLENGE` | Chấp nhận thách đấu | `ACCEPT_CHALLENGE` |
| `DECLINE_CHALLENGE` | Từ chối thách đấu | `DECLINE_CHALLENGE` |
| `AUTO_MATCH` | Tự động ghép cặp | `AUTO_MATCH` |
| `MOVE:row,col` | Đánh cờ | `MOVE:1,2` |
| `RESET` | Chơi lại | `RESET` |
| `LEAVE_GAME` | Thoát khỏi ván đấu | `LEAVE_GAME` |
| `HISTORY:username` | Lấy lịch sử đấu | `HISTORY:player1` |
| `RANKING` | Lấy bảng xếp hạng | `RANKING` |
| `GET_ONLINE_PLAYERS` | Lấy danh sách người chơi online | `GET_ONLINE_PLAYERS` |

### Server → Client

| Lệnh | Mô tả |
|------|-------|
| `LOGIN_OK` | Đăng nhập thành công |
| `LOGIN_FAIL:message` | Đăng nhập thất bại |
| `REGISTER_OK` | Đăng ký thành công |
| `REGISTER_FAIL:message` | Đăng ký thất bại |
| `CHALLENGE_REQUEST:username` | Nhận lời thách đấu |
| `CHALLENGE_SENT:username` | Đã gửi thách đấu |
| `CHALLENGE_ACCEPTED` | Thách đấu được chấp nhận |
| `CHALLENGE_DECLINED:username` | Thách đấu bị từ chối |
| `CHALLENGE_TIMEOUT:username` | Thách đấu hết hạn (15 giây) |
| `AUTO_MATCH_QUEUED` | Đã vào hàng chờ ghép cặp |
| `YourMove` | Đến lượt bạn đánh |
| `ValidMove row,col` | Nước đi hợp lệ |
| `OpponentMove row,col` | Đối thủ đã đánh |
| `Win:winner:loser` | Bạn thắng |
| `Lose:winner:loser` | Bạn thua |
| `Draw` | Hòa |
| `GAME_LEFT` | Đã thoát khỏi ván đấu |
| `ONLINE_PLAYERS:list` | Danh sách người chơi online |
| `END_HISTORY` | Kết thúc danh sách lịch sử |
| `END_RANKING` | Kết thúc bảng xếp hạng |

## 📝 Lưu ý

### Dữ liệu
- Thư mục `server/data/` sẽ được tạo tự động khi chạy server
- File `accounts.txt` sẽ được tạo tự động khi có người dùng đăng ký
- Dữ liệu được lưu dưới dạng text file đơn giản

### Bảo mật
- Mật khẩu được lưu dưới dạng plain text (không mã hóa)
- **Không nên sử dụng mật khẩu thật** cho mục đích phát triển/test
- Để sử dụng trong production, cần thêm mã hóa mật khẩu

### Ports
- **WebSocket Server**: Port 12345
- **HTTP Server**: Port 8000
- Đảm bảo các port này không bị chiếm bởi ứng dụng khác

### Session
- Session được lưu trong `sessionStorage` của trình duyệt
- Session sẽ mất khi đóng tab/trình duyệt
- Cần đăng nhập lại sau khi đóng trình duyệt

## 🔧 Troubleshooting

### Lỗi "Không kết nối được đến server"

**Nguyên nhân**: WebSocket server chưa chạy hoặc port bị chiếm

**Giải pháp**:
1. Kiểm tra WebSocket server đã chạy chưa (Terminal 1)
2. Kiểm tra port 12345 có bị chiếm không:
   ```bash
   # Windows
   netstat -ano | findstr :12345
   
   # Linux/Mac
   lsof -i :12345
   ```
3. Đổi port trong `server/serverMain.js` nếu cần

### Lỗi 404 khi truy cập trang

**Nguyên nhân**: HTTP server chưa chạy hoặc đường dẫn sai

**Giải pháp**:
1. Kiểm tra HTTP server đã chạy chưa (Terminal 2)
2. Đảm bảo truy cập đúng URL: `http://localhost:8000`
3. Kiểm tra port 8000 có bị chiếm không

### Không thể đăng ký tài khoản

**Nguyên nhân**: Tên đăng nhập đã tồn tại hoặc mật khẩu quá ngắn

**Giải pháp**:
1. Thử tên đăng nhập khác
2. Đảm bảo mật khẩu có ít nhất 3 ký tự
3. Kiểm tra mật khẩu xác nhận khớp với mật khẩu

### Không thấy người chơi online

**Nguyên nhân**: Chưa có người chơi nào online hoặc kết nối WebSocket bị lỗi

**Giải pháp**:
1. Mở nhiều tab/trình duyệt và đăng nhập với các tài khoản khác nhau
2. Kiểm tra kết nối WebSocket trong Developer Tools (F12)
3. Refresh trang để tải lại danh sách

### Game không phản hồi

**Nguyên nhân**: Kết nối WebSocket bị ngắt hoặc server bị lỗi

**Giải pháp**:
1. Kiểm tra console trong Developer Tools (F12) để xem lỗi
2. Refresh trang và đăng nhập lại
3. Kiểm tra server logs để xem lỗi
4. Khởi động lại cả 2 server

## 📄 License

ISC

## 👥 Tác giả

**Group 8 - Lập Trình Mạng**

Dự án được phát triển cho mục đích học tập và nghiên cứu.

---

**Lưu ý**: Đây là phiên bản phát triển. Để sử dụng trong môi trường production, cần thêm các tính năng bảo mật như mã hóa mật khẩu, HTTPS, và xác thực token.
