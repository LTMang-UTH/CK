/**
 * VÍ DỤ SỬ DỤNG COMPONENT CanvasDraw
 * 
 * File này minh họa cách tích hợp CanvasDraw vào GameRoom
 * với WebSocket để hỗ trợ multiplayer
 */

import React, { useRef, useEffect, useState } from 'react';
import CanvasDraw, { CanvasDrawRef, DrawingData } from './CanvasDraw';
import { websocketService } from '../services/websocketService';

const GameRoomExample = () => {
  const canvasRef = useRef<CanvasDrawRef>(null);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [isDrawer, setIsDrawer] = useState(true);
  const roomId = 'room123'; // Lấy từ store hoặc props

  // Xử lý khi vẽ (gửi dữ liệu qua WebSocket)
  const handleDraw = (data: DrawingData) => {
    if (!isDrawer) return; // Chỉ drawer mới gửi

    // Gửi dữ liệu vẽ qua WebSocket
    // Format: { x, y, color, lineWidth, isDrawing }
    websocketService.emit('drawEvent', {
      roomId,
      payload: {
        action: data.isDrawing ? 'pencil' : 'stop',
        x: data.x,
        y: data.y,
        color: data.color,
        lineWidth: data.lineWidth,
        isDrawing: data.isDrawing,
      },
    });
  };

  // Lắng nghe sự kiện vẽ từ WebSocket (cho multiplayer)
  useEffect(() => {
    const socket = websocketService.getSocket();
    if (!socket) return;

    const handleDrawEvent = (data: string) => {
      try {
        const drawData = JSON.parse(data);
        
        // Chỉ nhận dữ liệu nếu không phải drawer (tránh vẽ lại nét của chính mình)
        if (!isDrawer && canvasRef.current) {
          // Chuyển đổi format từ server sang format của CanvasDraw
          const canvasDrawData: DrawingData = {
            x: drawData.x || drawData.end?.X || 0,
            y: drawData.y || drawData.end?.Y || 0,
            color: drawData.color || '#000000',
            lineWidth: drawData.lineWidth || 5,
            isDrawing: drawData.isDrawing !== false, // Mặc định true
          };

          // Vẽ lại lên canvas
          canvasRef.current.receiveDraw(canvasDrawData);
        }
      } catch (error) {
        console.error('Failed to parse drawEvent:', error);
      }
    };

    socket.on('drawEvent', handleDrawEvent);

    return () => {
      socket.off('drawEvent', handleDrawEvent);
    };
  }, [isDrawer]);

  // Xử lý xóa canvas
  const handleClear = () => {
    if (!isDrawer || !canvasRef.current) return;
    
    canvasRef.current.clear();
    
    // Gửi sự kiện clear qua WebSocket
    websocketService.emit('drawEvent', {
      roomId,
      payload: {
        action: 'clear',
        x: 0,
        y: 0,
        color: '#FFFFFF',
        lineWidth: 0,
        isDrawing: false,
      },
    });
  };

  return (
    <div>
      {/* Toolbar để chỉnh màu và độ dày nét */}
      {isDrawer && (
        <div style={{ marginBottom: '10px' }}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
          />
          <span>Độ dày: {lineWidth}px</span>
          <button onClick={handleClear}>Xóa</button>
        </div>
      )}

      {/* Component CanvasDraw */}
      <CanvasDraw
        ref={canvasRef}
        width={800}
        height={600}
        color={color}
        lineWidth={lineWidth}
        isDrawingEnabled={isDrawer}
        onDraw={handleDraw}
      />
    </div>
  );
};

export default GameRoomExample;

