import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { websocketService } from '../services/websocketService';
import PlayerCard from '../components/PlayerCard';
import { getUsernameColor, getLighterColor } from '../utils/colorUtils';
import './WaitingRoom.css';

const WaitingRoom = () => {
  const navigate = useNavigate();
  const { roomId, players, setPlayers, setGameStarted, setGameState, restoreFromStorage, reset } = useGameStore();
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore roomId from sessionStorage on mount (for page reload)
    restoreFromStorage();
  }, [restoreFromStorage]);

  useEffect(() => {
    // If no roomId, redirect to main menu
    if (!roomId) {
      navigate('/');
      return;
    }

    // Ensure socket is connected first
    let socket = websocketService.getSocket();
    if (!socket || !socket.connected) {
      // Connect socket if not connected
      try {
        socket = websocketService.connect();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        navigate('/');
        return;
      }
    }

    // Setup event listeners FIRST before emitting joinRoom
    // This ensures we receive the playerList event when rejoin
    const handlePlayerList = (data: any[]) => {
      console.log('WaitingRoom received playerList:', data);
      if (Array.isArray(data)) {
        setPlayers(data);
      }
    };

    const handleJoinRoom = (data: string) => {
      try {
        const roomData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('WaitingRoom joinRoom response received:', roomData);
        
        if (roomData.error) {
          console.error('Join room error:', roomData.error);
          return;
        }

        // Khôi phục chat history từ backend
        // QUAN TRỌNG: Clear chat messages trước để tránh nhân đôi
        if (roomData.chatHistory && Array.isArray(roomData.chatHistory)) {
          const chatMessages = roomData.chatHistory.map((msg: any) => ({
            sender: msg.sender,
            message: msg.message,
          }));
          // Set trực tiếp, không append
          setChatMessages(chatMessages);
        } else {
          // Nếu không có chat history, clear để tránh tin nhắn cũ
          setChatMessages([]);
        }
      } catch (error) {
        console.error('Failed to parse joinRoom response:', error);
      }
    };

    const handleChatMessage = (data: string) => {
      const message = JSON.parse(data);
      setChatMessages((prev: Array<{ sender: string; message: string }>) => [...prev, message]);
    };

    const handleRoomClosed = () => {
      alert('Phòng đã đóng vì chủ phòng đã rời khỏi phòng!');
      navigate('/');
    };

    const handleStartGame = (data: string) => {
      const result = JSON.parse(data);
      if (result.error) {
        alert('Đã xảy ra lỗi!');
        setGameStarted(false);
      } else {
        setGameStarted(true);
        setGameState('changing_turn');
        navigate('/game-room');
      }
    };

    const handleKicked = (data: string) => {
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('WaitingRoom: Player was kicked:', result);
      // Nếu bị kick, navigate về main menu
      if (result.message || result.error) {
        alert(result.message || result.error || 'Bạn đã bị đuổi khỏi phòng');
        reset();
        navigate('/');
      }
    };

    socket.on('joinRoom', handleJoinRoom);
    socket.on('playerList', handlePlayerList);
    socket.on('chatMessage', handleChatMessage);
    socket.on('roomClosed', handleRoomClosed);
    socket.on('startGame', handleStartGame);
    socket.on('kicked', handleKicked); // Khi bị kick

    // Clear players list when entering waiting room (in case of old data)
    setPlayers([]);

    // Wait for socket to be connected before emitting
    const setupAndJoin = () => {
      if (socket.connected) {
        console.log('WaitingRoom: Socket connected, emitting joinRoom for roomId:', roomId);
        socket.emit('joinRoom', { roomId });
        
        // Also request playerList explicitly after a short delay
        setTimeout(() => {
          console.log('WaitingRoom: Requesting playerList for roomId:', roomId);
          socket.emit('playerList', { roomId });
        }, 300);
      } else {
        // Wait for connect event
        socket.once('connect', () => {
          console.log('WaitingRoom: Socket connected, emitting joinRoom for roomId:', roomId);
          socket.emit('joinRoom', { roomId });
          
          setTimeout(() => {
            console.log('WaitingRoom: Requesting playerList for roomId:', roomId);
            socket.emit('playerList', { roomId });
          }, 300);
        });
      }
    };

    setupAndJoin();

    return () => {
      socket.off('joinRoom', handleJoinRoom);
      socket.off('playerList', handlePlayerList);
      socket.off('chatMessage', handleChatMessage);
      socket.off('roomClosed', handleRoomClosed);
      socket.off('startGame', handleStartGame);
      socket.off('kicked', handleKicked);
    };
  }, [roomId, navigate, setPlayers, setGameStarted, setGameState, reset]);

  const handleInvite = () => {
    const formattedCode = roomId.slice(0, 4) + '-' + roomId.slice(4, 8);
    navigator.clipboard.writeText(formattedCode);
    setShowCopyNotification(true);
    setTimeout(() => {
      setShowCopyNotification(false);
    }, 2000);
  };

  const handleChatSend = () => {
    if (chatInput.trim()) {
      websocketService.emit('chatMessage', { roomId, message: chatInput });
      setChatInput('');
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleChatSend();
    }
  };

  const handleLeaveRoom = () => {
    // Emit leaveRoom event to notify backend
    if (roomId) {
      websocketService.emit('leaveRoom', { roomId });
    }
    // Reset game state
    reset();
    // Navigate back to main menu (room code entry page)
    navigate('/');
  };

  const formattedRoomId = roomId.slice(0, 4) + '-' + roomId.slice(4, 8);

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-content">
        <div className="room-header">
          <h2>Phòng Chờ</h2>
          <div className="room-id">ID: {formattedRoomId}</div>
          <div className="room-header-buttons">
            <button onClick={handleInvite} className="btn-secondary">
              Sao chép
            </button>
            <button onClick={handleLeaveRoom} className="btn-link">
              Thoát Phòng
            </button>
          </div>
        </div>

        {/* Thông báo đã copy */}
        {showCopyNotification && (
          <div className="copy-notification">
            <div className="copy-notification-content">
              ✓ Đã copy mã phòng!
            </div>
          </div>
        )}

        <div className="waiting-info">
          <p>Đang chờ chủ phòng bắt đầu game...</p>
        </div>

        <div className="room-players">
          <h3>Người Chơi ({players.length})</h3>
          <div className="players-list">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                playerName={player.name}
                playerScore={player.score}
              />
            ))}
          </div>
        </div>

        <div className="room-chat">
          <h3>Trò Chuyện</h3>
          <div className="chat-messages">
            {chatMessages.slice(-10).map((msg, idx) => {
              const senderColor = getUsernameColor(msg.sender);
              const backgroundColor = getLighterColor(senderColor, 0.1);
              return (
                <div
                  key={idx}
                  className="chat-message"
                  style={{
                    borderLeftColor: senderColor,
                    backgroundColor: backgroundColor,
                  }}
                >
                  <strong style={{ color: senderColor }}>{msg.sender}:</strong> {msg.message}
                </div>
              );
            })}
            <div ref={chatMessagesEndRef} />
          </div>
          <div className="chat-input-group">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleChatKeyPress}
              placeholder="Nhập tin nhắn..."
              className="chat-input"
            />
            <button onClick={handleChatSend} className="btn-primary">
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;

