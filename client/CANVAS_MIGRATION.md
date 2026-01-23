# Hướng dẫn chuyển từ Fabric.js sang CanvasDraw

## File đã tạo

1. **`src/components/CanvasDraw.tsx`** - Component vẽ bằng HTML Canvas thuần
2. **`src/pages/GameRoom.canvas.tsx`** - GameRoom sử dụng CanvasDraw (thay thế Fabric.js)
3. **`src/components/CanvasDraw.example.tsx`** - Ví dụ sử dụng
4. **`src/components/CanvasDraw.README.md`** - Tài liệu hướng dẫn

## Cách sử dụng

### Option 1: Thay thế file GameRoom.tsx

```bash
# Backup file cũ
mv src/pages/GameRoom.tsx src/pages/GameRoom.fabric.tsx

# Sử dụng file mới
mv src/pages/GameRoom.canvas.tsx src/pages/GameRoom.tsx
```

### Option 2: Giữ cả hai và test

Giữ nguyên `GameRoom.tsx` (Fabric.js) và test `GameRoom.canvas.tsx` riêng.

## So sánh

| Tính năng | Fabric.js (cũ) | CanvasDraw (mới) |
|-----------|----------------|------------------|
| Thư viện | Fabric.js (~200KB) | HTML Canvas thuần (0KB) |
| Vẽ | Fabric.Line objects | ctx.lineTo() trực tiếp |
| State | Lưu objects trong canvas | Không lưu, vẽ trực tiếp |
| Hiệu năng | Trung bình | Cao |
| Phù hợp đồ án | ❌ Quá mức | ✅ Rất phù hợp |

## Lưu ý

- Backend format vẫn giữ nguyên: `{ action, start: {X, Y}, end: {X, Y}, color }`
- Component CanvasDraw tự động chuyển đổi format
- Tất cả tính năng vẽ (pencil, eraser, clear) đều hoạt động

## Test

1. Start backend: `cd FunDraw-API-Express && npm run dev`
2. Start frontend: `cd FunDraw-React && npm run dev`
3. Login → Create room → Start game → Vẽ thử

