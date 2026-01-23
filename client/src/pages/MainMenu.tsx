import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { websocketService } from '../services/websocketService';
import Notification from '../components/Notification';
import './MainMenu.css';

const MainMenu = () => {
  const navigate = useNavigate();
  const { username, logout } = useAuthStore();
  const { setRoomId, setIsHost, reset } = useGameStore();
  const [roomCode, setRoomCode] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' | 'warning' } | null>(null);

  useEffect(() => {
    // Connect WebSocket - each tab has its own connection
    try {
      const socket = websocketService.connect();
      
      socket.on('connect', () => {
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('ping', () => {
        setSocketConnected(true);
      });

      socket.on('roomCreated', (data: string) => {
        const room = JSON.parse(data);
        // Reset game state before setting new room
        const { reset, setPlayers } = useGameStore.getState();
        reset(); // Clear old game state
        setRoomId(room.id); // This will also save to sessionStorage
        setIsHost(true); // This will also save to sessionStorage
        setPlayers([]); // Clear old players list
        navigate('/host-room');
      });

      socket.on('joinRoom', (data: string) => {
        const room = JSON.parse(data);
        if (room.error) {
          // Hiển thị message từ backend hoặc message mặc định
          const errorMessage = room.message || `Không tìm thấy phòng với mã: ${roomCode}`;
          setNotification({ message: errorMessage, type: 'error' });
        } else {
          // Reset game state before joining new room
          const { reset, setPlayers } = useGameStore.getState();
          reset(); // Clear old game state
          setRoomId(room.id); // This will also save to sessionStorage
          setIsHost(false); // This will also save to sessionStorage
          setPlayers([]); // Clear old players list
          navigate('/waiting-room');
        }
      });

      return () => {
        // Cleanup: remove event listeners when component unmounts
        // Note: WebSocket will disconnect when tab closes (handled in websocketService)
        socket.off('roomCreated');
        socket.off('joinRoom');
        socket.off('ping');
        socket.off('connect');
        socket.off('disconnect');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setSocketConnected(false);
    }
  }, [navigate, setRoomId, setIsHost, roomCode]);

  const handleCreateRoom = () => {
    websocketService.emit('createRoom');
  };

  const handleJoinRoom = () => {
    const cleanCode = roomCode.replace(/-/g, '');
    const isValid = /^[a-zA-Z0-9]{8}$/.test(cleanCode) || 
                    /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/.test(roomCode);
    
    if (!isValid) {
      setNotification({ message: 'Mã phòng không hợp lệ!', type: 'error' });
      return;
    }

    websocketService.emit('joinRoom', { roomId: cleanCode });
  };

  const handleLogout = async () => {
    const { reset } = useGameStore.getState();
    reset(); // Clear game state including roomId
    await logout();
    websocketService.disconnect();
    navigate('/login');
  };

  const formatRoomCode = (value: string) => {
    const cleaned = value.replace(/-/g, '').toUpperCase();
    if (cleaned.length <= 4) {
      return cleaned;
    }
    return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8);
  };

  return (
    <div className="main-menu-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={3000}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="main-menu-box">
        <div className="menu-header">
          <h1 className="menu-title">FunDraw</h1>
          <div className="user-info">
            <span className="username">Người chơi: {username}</span>
          </div>
        </div>

        <div className="menu-actions">
          <button onClick={handleCreateRoom} className="btn-primary btn-large">
            Tạo Phòng
          </button>

          <div className="join-section">
            <input
              type="text"
              placeholder="Mã phòng"
              value={roomCode}
              onChange={(e) => setRoomCode(formatRoomCode(e.target.value))}
              className="room-code-input"
              maxLength={9}
            />
            <button onClick={handleJoinRoom} className="btn-secondary btn-large">
              Tham Gia
            </button>
          </div>
        </div>

        <div className="menu-footer">
          <button onClick={() => navigate('/profile')} className="btn-link">
            Hồ sơ
          </button>
          <button onClick={handleLogout} className="btn-link">
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;

