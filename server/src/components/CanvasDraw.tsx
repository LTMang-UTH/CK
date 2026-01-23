import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

/**
 * Interface cho dữ liệu vẽ
 * - x, y: Tọa độ điểm vẽ
 * - color: Màu nét vẽ
 * - lineWidth: Độ dày nét vẽ
 * - isDrawing: true = đang vẽ (mouseDown/move), false = dừng vẽ (mouseUp/leave)
 */
export interface DrawingData {
  x: number;
  y: number;
  color: string;
  lineWidth: number;
  isDrawing: boolean;
  isEraser?: boolean; // Thêm flag để phân biệt tẩy
}

interface CanvasDrawProps {
  width?: number;
  height?: number;
  color?: string;
  lineWidth?: number;
  isDrawingEnabled?: boolean;
  onDraw?: (data: DrawingData) => void;
}

export interface CanvasDrawRef {
  clear: () => void;
  receiveDraw: (data: DrawingData, senderId?: string) => void;
}

/**
 * Component CanvasDraw - Vẽ bằng HTML Canvas thuần
 * 
 * Cách hoạt động:
 * 1. Sử dụng useRef để lưu reference đến canvas element và context
 * 2. Bắt sự kiện mouse trực tiếp trên canvas element (mouseDown, mouseMove, mouseUp, mouseLeave)
 * 3. Vẽ trực tiếp lên canvas context (KHÔNG lưu điểm vẽ vào React state)
 * 4. Gửi dữ liệu vẽ qua callback onDraw để broadcast qua WebSocket
 * 5. Nhận dữ liệu từ parent qua ref.receiveDraw() và vẽ lại lên canvas
 * 
 * Props:
 * - width, height: Kích thước canvas
 * - color: Màu nét vẽ
 * - lineWidth: Độ dày nét vẽ
 * - isDrawingEnabled: Cho phép vẽ hay không
 * - onDraw: Callback khi vẽ (để gửi qua WebSocket)
 */
const CanvasDraw = forwardRef<CanvasDrawRef, CanvasDrawProps>(({
  width = 800,
  height = 600,
  color = '#000000',
  lineWidth = 5,
  isDrawingEnabled = true,
  onDraw,
}, ref) => {
  // useRef để lưu reference đến canvas element và context
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // State để theo dõi trạng thái vẽ (KHÔNG lưu điểm vẽ, chỉ lưu trạng thái)
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Lưu điểm trước của từng người vẽ khác (cho multiplayer)
  // Key: socketId hoặc userId, Value: điểm trước
  const remoteLastPointsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Khởi tạo canvas khi component mount hoặc khi width/height thay đổi
  // Lưu ý: color và lineWidth được cập nhật trong useEffect riêng (dòng 97-102)
  // để tránh khởi tạo lại canvas mỗi khi chuyển đổi tool
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Lấy 2D context của canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cấu hình context
    ctx.lineCap = 'round'; // Nét tròn ở đầu và cuối
    ctx.lineJoin = 'round'; // Nét tròn ở góc
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    // Lưu context vào ref để dùng ở các hàm khác
    contextRef.current = ctx;

    // Thiết lập canvas size
    canvas.width = width;
    canvas.height = height;

    // Vẽ nền trắng
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // KHÔNG cập nhật context trong useEffect khi props thay đổi
  // Vì trong HTML Canvas, một khi đã stroke() một path, nó đã được vẽ lên canvas và không thể thay đổi
  // Context chỉ được cập nhật trong handleMouseDown khi bắt đầu path mới
  // Điều này đảm bảo các nét đã vẽ không bị ảnh hưởng khi chuyển đổi tool

  // Hàm nhận dữ liệu vẽ từ WebSocket (cho multiplayer)
  // Được gọi từ parent component khi nhận được dữ liệu từ server
  // Có thể nhận thêm senderId để phân biệt người vẽ (nếu cần)
  const receiveDraw = (data: DrawingData, senderId?: string) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    // Sử dụng senderId hoặc 'default' làm key
    const key = senderId || 'default';

    if (data.isDrawing) {
      // Nếu đang vẽ, vẽ đường thẳng
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      
      // Lấy điểm trước của người vẽ này
      const lastPoint = remoteLastPointsRef.current.get(key);
      
      if (lastPoint) {
        // Nếu có điểm trước, vẽ từ điểm trước đến điểm hiện tại
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else {
        // Nếu không có điểm trước (bắt đầu vẽ mới), vẽ một điểm nhỏ
        ctx.beginPath();
        ctx.arc(data.x, data.y, data.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = data.color;
        ctx.fill();
      }
      
      // Lưu điểm hiện tại làm điểm trước cho người vẽ này
      remoteLastPointsRef.current.set(key, { x: data.x, y: data.y });
    } else {
      // Nếu dừng vẽ, xóa điểm trước của người vẽ này
      remoteLastPointsRef.current.delete(key);
      ctx.beginPath();
    }
  };

  // Hàm xóa canvas
  const clearCanvas = () => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Xóa toàn bộ canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    lastPointRef.current = null;
  };

  // Expose các hàm để parent component có thể gọi
  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    receiveDraw: receiveDraw,
  }));

  // Hàm lấy tọa độ chuột trên canvas
  // QUAN TRỌNG: Phải tính toán scale factor vì canvas có thể bị scale bởi CSS
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Tính scale factor: kích thước hiển thị / kích thước thực tế của canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Tính tọa độ trên canvas (sau khi scale)
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  // Xử lý khi nhấn chuột xuống (bắt đầu vẽ)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled) return;

    const ctx = contextRef.current;
    if (!ctx) return;

    const coords = getCoordinates(e);
    
    // QUAN TRỌNG: Cập nhật context với giá trị mới nhất trước khi vẽ
    // Đảm bảo khi chuyển đổi tool, context được cập nhật ngay
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Bắt đầu vẽ
    setIsDrawing(true);
    lastPointRef.current = coords;

    // Bắt đầu path mới
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    // Gửi dữ liệu vẽ qua callback (để broadcast qua WebSocket)
    if (onDraw) {
      onDraw({
        x: coords.x,
        y: coords.y,
        color,
        lineWidth,
        isDrawing: true,
      });
    }
  };

  // Xử lý khi di chuyển chuột (vẽ nét liên tục)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled || !isDrawing || !lastPointRef.current) return;

    const ctx = contextRef.current;
    if (!ctx) return;

    const coords = getCoordinates(e);

    // QUAN TRỌNG: KHÔNG cập nhật context trong handleMouseMove
    // Vì nếu đang vẽ một path, việc thay đổi lineWidth sẽ ảnh hưởng đến toàn bộ path
    // Context chỉ được cập nhật trong handleMouseDown (khi bắt đầu path mới)
    // Vẽ đường thẳng từ điểm trước đến điểm hiện tại
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Cập nhật điểm cuối
    lastPointRef.current = coords;

    // Gửi dữ liệu vẽ qua callback (để broadcast qua WebSocket)
    if (onDraw) {
      onDraw({
        x: coords.x,
        y: coords.y,
        color,
        lineWidth,
        isDrawing: true,
      });
    }
  };

  // Xử lý khi nhả chuột (dừng vẽ)
  const handleMouseUp = () => {
    if (!isDrawing) return;

    const ctx = contextRef.current;
    if (!ctx) return;

    // Dừng vẽ
    setIsDrawing(false);
    const lastPoint = lastPointRef.current;
    lastPointRef.current = null;

    // Kết thúc path
    ctx.beginPath();

    // Gửi dữ liệu dừng vẽ
    if (onDraw && lastPoint) {
      onDraw({
        x: lastPoint.x,
        y: lastPoint.y,
        color,
        lineWidth,
        isDrawing: false,
      });
    }
  };

  // Xử lý khi chuột rời khỏi canvas (dừng vẽ)
  const handleMouseLeave = () => {
    handleMouseUp();
  };


  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: isDrawingEnabled ? 'crosshair' : 'default',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        display: 'block',
      }}
    />
  );
});

CanvasDraw.displayName = 'CanvasDraw';

export default CanvasDraw;

