# Component CanvasDraw - Hướng dẫn sử dụng

## Tổng quan

`CanvasDraw` là component React để vẽ trên HTML Canvas thuần, **KHÔNG dùng SVG, KHÔNG dùng thư viện vẽ ngoài** như Fabric.js. Component này phù hợp cho đồ án Client-Server về game vẽ và đoán hình.

## Đặc điểm

✅ **HTML Canvas thuần** - Không phụ thuộc thư viện ngoài  
✅ **useRef để thao tác trực tiếp** - Không lưu điểm vẽ vào React state  
✅ **Bắt sự kiện mouse** - mouseDown, mouseMove, mouseUp, mouseLeave  
✅ **Vẽ nét liên tục** - Khi giữ chuột và di chuyển  
✅ **Hỗ trợ multiplayer** - Gửi/nhận dữ liệu qua WebSocket  
✅ **Dễ mở rộng** - Có thể chỉnh màu, độ dày nét vẽ  

## Cách hoạt động

### 1. Khởi tạo Canvas

```typescript
// Sử dụng useRef để lưu reference đến canvas element
const canvasRef = useRef<HTMLCanvasElement>(null);
const contextRef = useRef<CanvasRenderingContext2D | null>(null);

// Lấy 2D context khi component mount
const ctx = canvas.getContext('2d');
```

### 2. Bắt sự kiện Mouse

```typescript
// mouseDown: Bắt đầu vẽ
handleMouseDown = (e) => {
  ctx.beginPath();
  ctx.moveTo(x, y);
  // Gửi dữ liệu qua WebSocket
}

// mouseMove: Vẽ nét liên tục
handleMouseMove = (e) => {
  ctx.lineTo(x, y);
  ctx.stroke();
  // Gửi dữ liệu qua WebSocket
}

// mouseUp / mouseLeave: Dừng vẽ
handleMouseUp = () => {
  ctx.beginPath();
  // Gửi dữ liệu dừng vẽ
}
```

### 3. Vẽ trực tiếp lên Canvas

```typescript
// Vẽ đường thẳng từ điểm A đến điểm B
ctx.beginPath();
ctx.moveTo(lastX, lastY);  // Điểm bắt đầu
ctx.lineTo(currentX, currentY);  // Điểm kết thúc
ctx.stroke();  // Vẽ nét
```

### 4. Gửi dữ liệu qua WebSocket

```typescript
// Khi vẽ, gửi dữ liệu (x, y, color, lineWidth, isDrawing)
onDraw({
  x: coords.x,
  y: coords.y,
  color: '#000000',
  lineWidth: 5,
  isDrawing: true,
});
```

### 5. Nhận dữ liệu và vẽ lại (Multiplayer)

```typescript
// Nhận dữ liệu từ WebSocket
canvasRef.current.receiveDraw({
  x: data.x,
  y: data.y,
  color: data.color,
  lineWidth: data.lineWidth,
  isDrawing: true,
});

// Vẽ lại lên canvas
ctx.lineTo(data.x, data.y);
ctx.stroke();
```

## Cách sử dụng

### Import component

```typescript
import CanvasDraw, { CanvasDrawRef, DrawingData } from './components/CanvasDraw';
```

### Khai báo ref

```typescript
const canvasRef = useRef<CanvasDrawRef>(null);
```

### Sử dụng trong JSX

```tsx
<CanvasDraw
  ref={canvasRef}
  width={800}
  height={600}
  color="#000000"
  lineWidth={5}
  isDrawingEnabled={true}
  onDraw={handleDraw}
/>
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `width` | `number` | `800` | Chiều rộng canvas |
| `height` | `number` | `600` | Chiều cao canvas |
| `color` | `string` | `'#000000'` | Màu nét vẽ |
| `lineWidth` | `number` | `5` | Độ dày nét vẽ |
| `isDrawingEnabled` | `boolean` | `true` | Cho phép vẽ hay không |
| `onDraw` | `(data: DrawingData) => void` | - | Callback khi vẽ (để gửi WebSocket) |

## Methods (qua ref)

```typescript
interface CanvasDrawRef {
  clear: () => void;              // Xóa canvas
  receiveDraw: (data: DrawingData) => void;  // Nhận dữ liệu vẽ từ WebSocket
}
```

## Interface DrawingData

```typescript
interface DrawingData {
  x: number;          // Tọa độ X
  y: number;          // Tọa độ Y
  color: string;      // Màu nét vẽ
  lineWidth: number;  // Độ dày nét vẽ
  isDrawing: boolean; // true = đang vẽ, false = dừng vẽ
}
```

## Ví dụ tích hợp với WebSocket

Xem file `CanvasDraw.example.tsx` để xem ví dụ đầy đủ về cách:
- Gửi dữ liệu vẽ qua WebSocket
- Nhận dữ liệu vẽ từ WebSocket
- Xử lý multiplayer (nhiều người vẽ cùng lúc)
- Xóa canvas và broadcast

## Lưu ý quan trọng

1. **KHÔNG lưu điểm vẽ vào React state** - Chỉ lưu trạng thái `isDrawing`, không lưu mảng điểm vẽ
2. **Vẽ trực tiếp lên canvas** - Sử dụng `ctx.lineTo()` và `ctx.stroke()` trực tiếp
3. **useRef cho context** - Lưu `contextRef` để dùng ở các hàm khác mà không cần re-render
4. **Gửi dữ liệu realtime** - Mỗi lần vẽ đều gửi qua `onDraw` callback để broadcast
5. **Nhận dữ liệu qua ref** - Sử dụng `canvasRef.current.receiveDraw()` để vẽ lại từ WebSocket

## So sánh với Fabric.js

| Tiêu chí | CanvasDraw (HTML Canvas) | Fabric.js |
|----------|-------------------------|-----------|
| Kích thước bundle | Nhỏ (~0KB) | Lớn (~200KB) |
| Hiệu năng | Cao (vẽ trực tiếp) | Trung bình (có abstraction layer) |
| Độ phức tạp | Đơn giản | Phức tạp |
| Phù hợp đồ án | ✅ Rất phù hợp | ❌ Quá mức cần thiết |
| Học tập | ✅ Hiểu rõ cách hoạt động | ❌ Phụ thuộc thư viện |

## Tài liệu tham khảo

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [React useRef Hook](https://react.dev/reference/react/useRef)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

