# Redis Setup (Optional)

Redis được sử dụng để cache tokens và tăng hiệu suất, nhưng **KHÔNG BẮT BUỘC**. Nếu Redis không chạy, hệ thống sẽ tự động fallback về database.

## Cài đặt Redis (Tùy chọn)

### Windows:
1. Download Redis for Windows từ: https://github.com/microsoftarchive/redis/releases
2. Hoặc sử dụng WSL (Windows Subsystem for Linux)
3. Hoặc dùng Docker: `docker run -d -p 6379:6379 redis`

### Linux/Mac:
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac
brew install redis

# Start Redis
redis-server
```

## Kiểm tra Redis

```bash
redis-cli ping
# Nếu trả về "PONG" thì Redis đang chạy
```

## Lưu ý

- Nếu Redis không chạy, hệ thống vẫn hoạt động bình thường
- Token sẽ được lưu và verify từ database thay vì Redis
- Hiệu suất có thể chậm hơn một chút nhưng vẫn ổn định

