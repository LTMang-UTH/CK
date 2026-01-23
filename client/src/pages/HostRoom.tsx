import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { websocketService } from '../services/websocketService';
import PlayerCard from '../components/PlayerCard';
import Notification from '../components/Notification';
import { getUsernameColor, getLighterColor } from '../utils/colorUtils';
import './HostRoom.css';

const HostRoom = () => {
  const navigate = useNavigate();
  const { roomId, players, setPlayers, setGameStarted, setGameState, restoreFromStorage, reset, isHost } = useGameStore();
  const { username } = useAuthStore();
  // Khởi tạo với null để tránh hiển thị giá trị mặc định trước khi nhận được từ backend
  const [playersCount, setPlayersCount] = useState<number | null>(null);
  const [drawTime, setDrawTime] = useState<number | null>(null);
  const [rounds, setRounds] = useState<number | null>(null);
  const [wordsCount, setWordsCount] = useState<number | null>(null);
  const [hints, setHints] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [errorNotification, setErrorNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' | 'warning' } | null>(null);
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
      console.log('HostRoom received playerList:', data);
      if (Array.isArray(data)) {
        setPlayers(data);
      }
    };

    const handleJoinRoom = (data: string) => {
      try {
        const roomData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('HostRoom joinRoom response received:', roomData);
        
        if (roomData.error) {
          console.error('Join room error:', roomData.error);
          return;
        }

        // Khôi phục room settings từ backend
        // QUAN TRỌNG: Luôn set giá trị từ backend, kể cả khi undefined (để đảm bảo không dùng giá trị mặc định)
        if (roomData.playersCount !== undefined && roomData.playersCount !== null) {
          console.log('HostRoom: Restoring playersCount from backend:', roomData.playersCount);
          setPlayersCount(roomData.playersCount);
        }
        if (roomData.turnDuration !== undefined && roomData.turnDuration !== null) {
          setDrawTime(roomData.turnDuration);
        }
        if (roomData.totalRounds !== undefined && roomData.totalRounds !== null) {
          setRounds(roomData.totalRounds);
        }
        if (roomData.wordsCount !== undefined && roomData.wordsCount !== null) {
          setWordsCount(roomData.wordsCount);
        }
        if (roomData.hintsCount !== undefined && roomData.hintsCount !== null) {
          setHints(roomData.hintsCount);
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
      setChatMessages((prev: Array<{ sender: string; message: string }>) => {
        const newMessages = [...prev, message];
        // Chỉ giữ 10 tin nhắn mới nhất
        return newMessages.slice(-10);
      });
    };

    const handleStartGame = (data: string) => {
      const result = JSON.parse(data);
      if (result.error) {
        alert(result.error);
        setGameStarted(false);
      } else {
        setGameStarted(true);
        setGameState('changing_turn');
        navigate('/game-room');
      }
    };

    const handleKicked = (data: string) => {
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('HostRoom: Player was kicked:', result);
      // Nếu bị kick, navigate về main menu
      if (result.message || result.error) {
        alert(result.message || result.error || 'Bạn đã bị đuổi khỏi phòng');
        reset();
        navigate('/');
      }
    };

    const handlePlayerKicked = (data: string) => {
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('HostRoom: A player was kicked:', result);
      // Refresh player list sau khi kick
      if (roomId) {
        setTimeout(() => {
          socket.emit('playerList', { roomId });
        }, 300);
      }
    };

    const handleUpdateRoomSettings = (data: string) => {
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.error) {
        console.error('HostRoom: updateRoomSettings error:', result.error);
        setErrorNotification({
          message: result.message || result.error || 'Có lỗi xảy ra khi cập nhật cài đặt phòng',
          type: 'error',
        });
        // Reset về giá trị cũ từ backend
        if (roomId) {
          setTimeout(() => {
            socket.emit('roomInfo', { roomId });
          }, 300);
        }
      }
    };

    socket.on('joinRoom', handleJoinRoom);
    socket.on('playerList', handlePlayerList);
    socket.on('chatMessage', handleChatMessage);
    socket.on('startGame', handleStartGame);
    socket.on('kicked', handleKicked); // Khi chính mình bị kick
    socket.on('playerKicked', handlePlayerKicked); // Khi một player khác bị kick
    socket.on('updateRoomSettings', handleUpdateRoomSettings); // Khi có response từ updateRoomSettings

    // Clear players list when entering host room (in case of old data)
    setPlayers([]);

    // Wait for socket to be connected before emitting
    const setupAndJoin = () => {
      if (socket.connected) {
        console.log('HostRoom: Socket connected, emitting joinRoom for roomId:', roomId);
        socket.emit('joinRoom', { roomId });
        
        // Also request playerList explicitly after a short delay
        setTimeout(() => {
          console.log('HostRoom: Requesting playerList for roomId:', roomId);
          socket.emit('playerList', { roomId });
        }, 300);
      } else {
        // Wait for connect event
        socket.once('connect', () => {
          console.log('HostRoom: Socket connected, emitting joinRoom for roomId:', roomId);
          socket.emit('joinRoom', { roomId });
          
          setTimeout(() => {
            console.log('HostRoom: Requesting playerList for roomId:', roomId);
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
        socket.off('startGame', handleStartGame);
        socket.off('kicked', handleKicked);
        socket.off('playerKicked', handlePlayerKicked);
        socket.off('updateRoomSettings', handleUpdateRoomSettings);
      };
  }, [roomId, navigate, setPlayers, setGameStarted, setGameState, reset]);

  const handleStartGame = () => {
    if (players.length < 2) {
      alert('Cần ít nhất 2 người chơi để bắt đầu game!');
      return;
    }

    websocketService.emit('startGame', {
      roomId,
      playersCount,
      drawTime,
      roundsCount: rounds,
      wordsCount,
      hintsCount: hints,
      customWords: [],
    });
  };

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

  const formattedRoomId = roomId ? (roomId.slice(0, 4) + '-' + roomId.slice(4, 8)) : '-';

  return (
    <div className="host-room-container">
      <div className="host-room-content">
        <div className="room-header">
          <h2>Phòng Chủ</h2>
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

        {/* Thông báo lỗi */}
        {errorNotification && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000 }}>
            <Notification
              message={errorNotification.message}
              type={errorNotification.type}
              duration={5000}
              onClose={() => setErrorNotification(null)}
            />
          </div>
        )}

        <div className="room-settings">
          <div className="setting-group">
            <label>Số Người Chơi:</label>
                <select
                  value={playersCount ?? 8}
                  onChange={(e) => {
                    const newCount = Number(e.target.value);
                    
                    // Validation: Không cho phép set Players Count nhỏ hơn số người hiện có
                    if (newCount < players.length) {
                      setErrorNotification({
                        message: `Không thể đặt Players Count là ${newCount} vì hiện có ${players.length} người trong phòng. Vui lòng đuổi một số người chơi trước.`,
                        type: 'error',
                      });
                      // Reset về giá trị cũ
                      return;
                    }
                    
                    setPlayersCount(newCount);
                    // Update playersCount on backend immediately
                    if (roomId) {
                      websocketService.emit('updateRoomSettings', {
                        roomId,
                        playersCount: newCount,
                      });
                    }
                  }}
                >
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Thời Gian Vẽ (giây):</label>
            <select value={drawTime ?? 120} onChange={(e) => setDrawTime(Number(e.target.value))}>
              {[30, 60, 90, 120, 150, 180].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Số Ván:</label>
            <select value={rounds ?? 3} onChange={(e) => setRounds(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Số Từ:</label>
            <select value={wordsCount ?? 3} onChange={(e) => setWordsCount(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>Số Gợi Ý:</label>
            <select value={hints ?? 2} onChange={(e) => setHints(Number(e.target.value))}>
              {[0, 1, 2, 3].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="room-players">
          <h3>Người Chơi ({players.length})</h3>
          <div className="players-list">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                playerName={player.name}
                playerScore={player.score}
                playerId={player.id}
                isHost={isHost}
                currentUsername={username}
                onKick={(playerId, playerName) => {
                  if (roomId) {
                    console.log(`HostRoom: Kicking player ${playerName} (${playerId}) from room ${roomId}`);
                    websocketService.emit('kickPlayer', {
                      roomId,
                      playerId,
                    });
                  }
                }}
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

        <button onClick={handleStartGame} className="btn-primary btn-start">
          Bắt Đầu Game
        </button>
      </div>
    </div>
  );
};

export default HostRoom;

