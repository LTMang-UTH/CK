/**
 * GameRoom với CanvasDraw (HTML Canvas thuần)
 * Thay thế Fabric.js bằng component CanvasDraw
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CanvasDraw, { CanvasDrawRef, DrawingData as CanvasDrawingData } from '../components/CanvasDraw';
import { useGameStore } from '../store/gameStore';
import { websocketService } from '../services/websocketService';
import { useAuthStore } from '../store/authStore';
import PlayerCard from '../components/PlayerCard';
import WordButton from '../components/WordButton';
import Leaderboard from '../components/Leaderboard';
import type { GameProgress, ChooseWordData, ChatMessage } from '../types';
import { getUsernameColor, getLighterColor } from '../utils/colorUtils';
import './GameRoom.css';

const GameRoom = () => {
  const navigate = useNavigate();
  const canvasDrawRef = useRef<CanvasDrawRef>(null);
  const { username } = useAuthStore();
  const {
    roomId,
    isHost,
    isDrawer,
    players,
    gameState,
    timeLeft,
    currentRound,
    totalRounds,
    setPlayers,
    setIsDrawer,
    setGameState,
    setTimeLeft,
    setCurrentWord,
    setCurrentRound,
    setTotalRounds,
    setGameStarted,
    restoreFromStorage,
    reset,
  } = useGameStore();

  const handleExitGame = () => {
    // Emit leaveRoom event to notify backend
    if (roomId) {
      websocketService.emit('leaveRoom', { roomId });
    }
    // Reset game state
    reset();
    // Navigate back to main menu (room code entry page)
    navigate('/');
  };

  const [wordSelectorWords, setWordSelectorWords] = useState<string[]>([]);
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [showWordChooseBox, setShowWordChooseBox] = useState(false);
  const [drawerName, setDrawerName] = useState('');
  const [wordHint, setWordHint] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEndTurn, setShowEndTurn] = useState(false);
  const [endTurnWord, setEndTurnWord] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const [showEndGame, setShowEndGame] = useState(false);
  const [endGamePlayers, setEndGamePlayers] = useState<any[]>([]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [scoreNotification, setScoreNotification] = useState<{ score: number; type: 'guesser' | 'drawer' } | null>(null);
  // Lưu màu cọ trước khi chuyển sang tẩy để khôi phục khi chuyển về bút chì
  const savedColorRef = useRef<string>('#000000');

  // Lưu điểm trước để chuyển đổi format (gửi)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Lưu điểm trước khi nhận từ backend (nhận)
  const lastReceivedPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Flag để đánh dấu đang khôi phục drawing history (tránh vẽ lại nét của chính mình khi là drawer)
  const isRestoringHistoryRef = useRef(false);

  // Chuyển đổi từ CanvasDrawingData sang format backend (PayloadEvent)
  const convertToBackendFormat = (data: CanvasDrawingData) => {
    if (!lastPointRef.current) {
      // Nếu không có điểm trước, dùng điểm hiện tại làm start và end
      lastPointRef.current = { x: data.x, y: data.y };
      return {
        action: data.isDrawing ? (isEraser ? 'eraser' : 'pencil') : 'stop',
        start: { X: data.x, Y: data.y },
        end: { X: data.x, Y: data.y },
        color: isEraser ? '#FFFFFF' : data.color,
      };
    }

    const result = {
      action: data.isDrawing ? (isEraser ? 'eraser' : 'pencil') : 'stop',
      start: { X: lastPointRef.current.x, Y: lastPointRef.current.y },
      end: { X: data.x, Y: data.y },
      color: isEraser ? '#FFFFFF' : data.color,
    };

    if (data.isDrawing) {
      lastPointRef.current = { x: data.x, y: data.y };
    } else {
      lastPointRef.current = null;
    }

    return result;
  };

  // Xử lý khi vẽ (gửi qua WebSocket)
  const handleDraw = (data: CanvasDrawingData) => {
    if (!isDrawer || gameState !== 'playing') return;

    const backendData = convertToBackendFormat(data);
    websocketService.emit('drawEvent', { roomId, payload: backendData });
  };

  // WebSocket event handlers
  useEffect(() => {
    restoreFromStorage();
    
    if (!roomId) {
      navigate('/');
      return;
    }

    let socket = websocketService.getSocket();
    if (!socket || !socket.connected) {
      try {
        socket = websocketService.connect();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        navigate('/');
        return;
      }
    }

    const handlePlayerList = (data: any[]) => {
      console.log('GameRoom playerList received:', data);
      if (Array.isArray(data)) {
        // Đảm bảo sắp xếp theo điểm giảm dần (backend đã sort nhưng đảm bảo ở frontend)
        const sortedPlayers = [...data].sort((a: any, b: any) => b.score - a.score);
        setPlayers(sortedPlayers);
        console.log('GameRoom: Updated players list (sorted by score):', sortedPlayers.map((p: any) => `${p.name}: ${p.score}`));
      }
    };

    const handleStartGame = (data: string) => {
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('GameRoom startGame received:', result);
      if (result.error) {
        alert(result.error);
      } else {
        setGameState('changing_turn');
        setGameStarted(true);
      }
    };

    const handleGameProgress = (data: GameProgress) => {
      console.log('GameRoom gameProgress received:', data);
      setGameState(data.state);
      setTimeLeft(data.timeLeft || 0);
      if (data.word) {
        setCurrentWord(data.word);
      }

      if (data.state === 'ending') {
        setShowEndGame(true);
        setEndGamePlayers(data.players || []);
      } else if (data.state === 'end') {
        // Nếu có returnToRoom, chuyển về phòng cũ
        if ((data as any).returnToRoom) {
          // Reset một số state nhưng giữ roomId và isHost
          setGameState('waiting');
          setGameStarted(false);
          setIsDrawer(false);
          setTimeLeft(0);
          setCurrentWord(null);
          setCurrentRound(0);
          
          // Chuyển về phòng cũ dựa trên isHost
          if (isHost) {
            navigate('/host-room');
          } else {
            navigate('/waiting-room');
          }
        } else {
          // Nếu không có returnToRoom, về main menu
          reset();
          navigate('/');
        }
      } else if (data.state === 'end_turn') {
        setShowEndTurn(true);
        setEndTurnWord(data.word || '');
        // Tự động xóa hình vẽ cũ khi kết thúc turn
        if (canvasDrawRef.current) {
          canvasDrawRef.current.clear();
          lastPointRef.current = null;
        }
        setTimeout(() => {
          setShowEndTurn(false);
        }, 5000);
      } else if (data.state === 'changing_turn') {
        setShowWordSelector(false);
        setShowWordChooseBox(false);
        // Đảm bảo canvas đã được xóa (nếu chưa xóa ở end_turn)
        if (canvasDrawRef.current) {
          canvasDrawRef.current.clear();
          lastPointRef.current = null;
        }
      } else if (data.state === 'playing') {
        // Khi game chuyển sang trạng thái 'playing', tắt tất cả overlay chọn từ
        // Điều này đảm bảo khi timeout 15s, overlay sẽ được tắt
        setShowWordSelector(false);
        setShowWordChooseBox(false);
        if (data.word) {
          setWordHint(data.word);
        }
      }
    };

    const handleChooseWord = (data: ChooseWordData | string) => {
      console.log('GameRoom chooseWord received:', data);
      const chooseData: ChooseWordData = typeof data === 'string' ? JSON.parse(data) : data;
      if (chooseData.state === 'you-selected') {
        // Từ đã được chọn (có thể là tự chọn hoặc timeout)
        setShowWordSelector(false);
        setIsDrawer(true);
        setShowWordChooseBox(false);
        if (chooseData.round) setCurrentRound(chooseData.round);
        if (chooseData.totalRounds) setTotalRounds(chooseData.totalRounds);
      } else if (chooseData.state === 'selected') {
        // Từ đã được chọn bởi drawer (cho guessers)
        setShowWordSelector(false);
        setShowWordChooseBox(false);
        if (chooseData.round) setCurrentRound(chooseData.round);
        if (chooseData.totalRounds) setTotalRounds(chooseData.totalRounds);
      } else {
        // Bắt đầu chọn từ
        if (chooseData.drawer === '#you') {
          setIsDrawer(true);
          setShowWordSelector(true);
          setWordSelectorWords(chooseData.words || []);
          setShowWordChooseBox(false);
        } else {
          setIsDrawer(false);
          setShowWordChooseBox(true);
          setDrawerName(chooseData.drawer || '');
        }
        if (chooseData.round) setCurrentRound(chooseData.round);
        if (chooseData.totalRounds) setTotalRounds(chooseData.totalRounds);
      }
    };

    // Chuyển đổi từ backend format sang CanvasDrawingData
    // Backend format: { action, start: {X, Y}, end: {X, Y}, color }
    // Cần vẽ từ start đến end, nhưng CanvasDraw chỉ nhận điểm cuối
    // Nên ta sẽ gửi 2 lần: một lần với start (nếu chưa có), một lần với end
    const convertFromBackendFormat = (payload: any): CanvasDrawingData[] => {
      try {
        // Backend format: { action, start: {X, Y}, end: {X, Y}, color }
        if (payload.action === 'clear') {
          if (canvasDrawRef.current) {
            canvasDrawRef.current.clear();
          }
          lastReceivedPointRef.current = null;
          return [];
        }

        if (payload.action === 'stop') {
          lastReceivedPointRef.current = null;
          return [{
            x: payload.end?.X || 0,
            y: payload.end?.Y || 0,
            color: payload.color || '#000000',
            // QUAN TRỌNG: Sử dụng lineWidth dựa trên action, KHÔNG dùng từ state
            // Để đảm bảo các nét đã vẽ giữ nguyên kích thước khi replay history
            lineWidth: payload.action === 'eraser' ? 20 : 5,
            isDrawing: false,
          }];
        }

        // Vẽ từ start đến end
        const startX = payload.start?.X || 0;
        const startY = payload.start?.Y || 0;
        const endX = payload.end?.X || 0;
        const endY = payload.end?.Y || 0;
        const color = payload.color || '#000000';
        // QUAN TRỌNG: Sử dụng lineWidth dựa trên action, KHÔNG dùng từ state
        // Để đảm bảo các nét đã vẽ giữ nguyên kích thước khi replay history
        const width = payload.action === 'eraser' ? 20 : 5;

        // Nếu start khác với điểm trước, cần vẽ từ start trước
        const result: CanvasDrawingData[] = [];
        
        if (!lastReceivedPointRef.current || 
            lastReceivedPointRef.current.x !== startX || 
            lastReceivedPointRef.current.y !== startY) {
          // Vẽ điểm start trước
          result.push({
            x: startX,
            y: startY,
            color,
            lineWidth: width,
            isDrawing: true,
          });
        }

        // Vẽ đến điểm end
        result.push({
          x: endX,
          y: endY,
          color,
          lineWidth: width,
          isDrawing: true,
        });

        lastReceivedPointRef.current = { x: endX, y: endY };
        return result;
      } catch (error) {
        console.error('Failed to convert backend format:', error);
        return [];
      }
    };

    const handleDrawEvent = (data: string) => {
      try {
        const payload = typeof data === 'string' ? JSON.parse(data) : data;
        const canvasDataArray = convertFromBackendFormat(payload);
        
        // Vẽ từng điểm trong mảng
        if (canvasDataArray.length > 0 && canvasDrawRef.current) {
          // Nếu đang restore history, vẽ cho tất cả (kể cả drawer)
          // Nếu không, chỉ vẽ cho người đoán (tránh vẽ lại nét của chính mình)
          if (isRestoringHistoryRef.current || !isDrawer) {
            canvasDataArray.forEach((canvasData) => {
              canvasDrawRef.current?.receiveDraw(canvasData);
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse drawEvent:', error);
      }
    };

    const handleChatMessage = (data: string) => {
      const message: ChatMessage = JSON.parse(data);
      setChatMessages((prev: ChatMessage[]) => {
        const newMessages = [...prev, message];
        // Chỉ giữ 10 tin nhắn mới nhất
        return newMessages.slice(-10);
      });
    };

    const handleChatGuessed = (data: string) => {
      const message: ChatMessage = JSON.parse(data);
      setChatMessages((prev: ChatMessage[]) => {
        const newMessages = [...prev, message];
        // Chỉ giữ 10 tin nhắn mới nhất
        return newMessages.slice(-10);
      });
    };

    const handleScoreNotification = (data: string) => {
      try {
        const notification = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('GameRoom scoreNotification received:', notification);
        setScoreNotification(notification);
        
        // Tự động ẩn sau 2 giây
        setTimeout(() => {
          setScoreNotification(null);
        }, 2000);
      } catch (error) {
        console.error('Failed to parse scoreNotification:', error);
      }
    };

    const handleRoomInfo = (data: string) => {
      try {
        const roomInfo = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('GameRoom roomInfo received:', roomInfo);
        
        if (roomInfo.error) {
          console.error('Room info error:', roomInfo.error);
          return;
        }

        if (roomInfo.isDrawer !== undefined) {
          console.log('GameRoom: Restoring isDrawer from roomInfo:', roomInfo.isDrawer);
          setIsDrawer(roomInfo.isDrawer);
        }

        if (roomInfo.state) {
          setGameState(roomInfo.state);
        }
        if (roomInfo.currentRound) {
          setCurrentRound(roomInfo.currentRound);
        }
        if (roomInfo.totalRounds) {
          setTotalRounds(roomInfo.totalRounds);
        }
      } catch (error) {
        console.error('Failed to parse roomInfo:', error);
      }
    };

    const handleJoinRoomResponse = (data: string) => {
      try {
        const roomData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('GameRoom joinRoom response received:', roomData);
        
        if (roomData.error) {
          console.error('Join room error:', roomData.error);
          return;
        }

        if (roomData.isDrawer !== undefined) {
          console.log('GameRoom: Restoring isDrawer from joinRoom:', roomData.isDrawer);
          setIsDrawer(roomData.isDrawer);
        }

        if (roomData.state) {
          setGameState(roomData.state);
        }
        if (roomData.currentRound) {
          setCurrentRound(roomData.currentRound);
        }
        if (roomData.totalRounds) {
          setTotalRounds(roomData.totalRounds);
        }

        // Drawing history sẽ được gửi riêng qua drawEvent events sau khi joinRoom
        // Không cần xử lý ở đây vì backend đã tự động gửi
      } catch (error) {
        console.error('Failed to parse joinRoom response:', error);
      }
    };

    socket.on('playerList', handlePlayerList);
    socket.on('startGame', handleStartGame);
    socket.on('gameProgress', handleGameProgress);
    socket.on('chooseWord', handleChooseWord);
    socket.on('drawEvent', handleDrawEvent);
    socket.on('chatMessage', handleChatMessage);
    socket.on('chatGuessed', handleChatGuessed);
    socket.on('scoreNotification', handleScoreNotification);
    socket.on('roomInfo', handleRoomInfo);
    socket.on('joinRoom', handleJoinRoomResponse);

    const setupAndJoin = () => {
      if (socket.connected) {
        console.log('GameRoom: Socket connected, emitting joinRoom for roomId:', roomId);
        // Đánh dấu đang restore history
        isRestoringHistoryRef.current = true;
        socket.emit('joinRoom', { roomId });
        
        setTimeout(() => {
          socket.emit('playerList', { roomId });
          socket.emit('roomInfo', { roomId });
          console.log('GameRoom: Requesting room info to sync game state');
          
          // Sau khi nhận xong drawing history (khoảng 500ms), tắt flag
          setTimeout(() => {
            isRestoringHistoryRef.current = false;
            console.log('GameRoom: Finished restoring drawing history');
          }, 500);
        }, 100);
      } else {
        socket.once('connect', () => {
          console.log('GameRoom: Socket connected, emitting joinRoom for roomId:', roomId);
          // Đánh dấu đang restore history
          isRestoringHistoryRef.current = true;
          socket.emit('joinRoom', { roomId });
          
          setTimeout(() => {
            socket.emit('playerList', { roomId });
            socket.emit('roomInfo', { roomId });
            console.log('GameRoom: Requesting room info to sync game state');
            
            // Sau khi nhận xong drawing history (khoảng 500ms), tắt flag
            setTimeout(() => {
              isRestoringHistoryRef.current = false;
              console.log('GameRoom: Finished restoring drawing history');
            }, 500);
          }, 100);
        });
      }
    };

    setupAndJoin();

    return () => {
      socket.off('playerList', handlePlayerList);
      socket.off('startGame', handleStartGame);
      socket.off('gameProgress', handleGameProgress);
      socket.off('chooseWord', handleChooseWord);
      socket.off('drawEvent', handleDrawEvent);
      socket.off('chatMessage', handleChatMessage);
      socket.off('chatGuessed', handleChatGuessed);
      socket.off('scoreNotification', handleScoreNotification);
      socket.off('roomInfo', handleRoomInfo);
      socket.off('joinRoom', handleJoinRoomResponse);
    };
    // QUAN TRỌNG: Loại bỏ lineWidth khỏi dependency array để tránh re-render khi chuyển tool
    // Chuyển tool chỉ cần đổi màu và lineWidth, không cần reload lại drawing history
  }, [roomId, isDrawer, isHost, navigate, setPlayers, setGameState, setTimeLeft, setCurrentWord, setCurrentRound, setTotalRounds, setIsDrawer, setGameStarted, reset, restoreFromStorage]);

  const handleClear = () => {
    if (!canvasDrawRef.current || !isDrawer) return;
    canvasDrawRef.current.clear();
    lastPointRef.current = null;
    
    // Gửi sự kiện clear
    websocketService.emit('drawEvent', {
      roomId,
      payload: {
        action: 'clear',
        start: { X: 0, Y: 0 },
        end: { X: 0, Y: 0 },
        color: '#FFFFFF',
      },
    });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    // Nếu đang dùng tẩy, chuyển về bút chì trước
    if (isEraser) {
      setIsEraser(false);
      setLineWidth(5);
    }
    // Lưu màu mới
    savedColorRef.current = newColor;
    setCurrentColor(newColor);
    // Reset lastPoint khi chuyển tool để tránh vẽ nối từ điểm cũ
    lastPointRef.current = null;
  };

  const handleEraser = () => {
    // Nếu chưa phải tẩy, lưu màu hiện tại trước khi chuyển
    if (!isEraser) {
      savedColorRef.current = currentColor;
    }
    setIsEraser(true);
    setCurrentColor('#FFFFFF'); // Màu trắng cho tẩy
    setLineWidth(20); // Tăng kích thước tẩy lên để tẩy nhanh hơn
    // Reset lastPoint khi chuyển tool để tránh vẽ nối từ điểm cũ
    lastPointRef.current = null;
  };

  const handlePencil = () => {
    setIsEraser(false);
    // Khôi phục màu đã lưu trước khi chuyển sang tẩy
    setCurrentColor(savedColorRef.current);
    setLineWidth(5); // Giảm kích thước bút về ban đầu
    // Reset lastPoint khi chuyển tool để tránh vẽ nối từ điểm cũ
    lastPointRef.current = null;
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


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!roomId) {
    return (
      <div className="game-room-container">
        <div className="game-room-content">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Không tìm thấy phòng</h2>
            <button onClick={() => navigate('/')} className="btn-primary">
              Về Menu Chính
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-room-container">
      <div className="game-room-content">
        <div className="game-header">
          <div className="game-info">
            <h2>Ván {currentRound || 0}/{totalRounds || 3}</h2>
            <div className="timer">{formatTime(timeLeft || 0)}</div>
            {wordHint && <div className="word-hint">{wordHint}</div>}
          </div>
          <button onClick={handleExitGame} className="btn-link">
            Thoát Game
          </button>
        </div>

        <div className="game-main">
          <div className="game-left">
            <div className="players-section">
              <h3>Người Chơi</h3>
              <div className="players-list">
                {gameState === 'playing' ? (
                  // Khi đang chơi, chỉ hiển thị bản thân
                  players
                    .filter((player: any) => player.name === username)
                    .map((player: any) => (
                      <PlayerCard
                        key={player.id}
                        playerName={player.name}
                        playerScore={player.score}
                      />
                    ))
                ) : (
                  // Khi không chơi, hiển thị tất cả players
                  players.map((player: any) => (
                    <PlayerCard
                      key={player.id}
                      playerName={player.name}
                      playerScore={player.score}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="chat-section">
              <h3>Trò Chuyện</h3>
              <div className="chat-messages">
                {chatMessages.slice(-10).map((msg, idx) => {
                  const senderColor = getUsernameColor(msg.sender);
                  const backgroundColor = getLighterColor(senderColor, 0.1);
                  return (
                    <div
                      key={idx}
                      className={`chat-message ${msg.message === 'guessed' ? 'guessed' : ''}`}
                      style={{
                        borderLeftColor: senderColor,
                        backgroundColor: msg.message === 'guessed' ? getLighterColor('#4caf50', 0.15) : backgroundColor,
                      }}
                    >
                      <strong style={{ color: senderColor }}>{msg.sender}:</strong>{' '}
                      {msg.message === 'guessed' ? 'đã đoán đúng từ!' : msg.message}
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
                  placeholder={isDrawer && gameState === 'playing' ? "Bạn không thể chat khi đang vẽ..." : "Nhập tin nhắn..."}
                  className="chat-input"
                  disabled={isDrawer && gameState === 'playing'}
                />
                <button 
                  onClick={handleChatSend} 
                  className="btn-primary"
                  disabled={isDrawer && gameState === 'playing'}
                >
                  Gửi
                </button>
              </div>
            </div>
          </div>

          <div className="game-center">
            {showWordSelector && (
              <div className="word-selector-overlay" style={{ zIndex: 2000 }}>
                <div className="word-selector">
                  <h3>Chọn một từ:</h3>
                  <div className="words-list">
                    {wordSelectorWords.map((word: string, idx: number) => (
                      <WordButton key={idx} word={word} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showWordChooseBox && !showWordSelector && !isDrawer && (
              <div className="word-choose-overlay" style={{ zIndex: 1000 }}>
                <div className="word-choose-box">
                  <p>{drawerName} đang chọn từ...</p>
                </div>
              </div>
            )}

            {showEndTurn && (
              <div className="end-turn-overlay">
                <div className="end-turn-box">
                  <h3>Lượt Chơi Kết Thúc!</h3>
                  <p>Từ là: {endTurnWord}</p>
                </div>
              </div>
            )}

            <div className="canvas-container">
              <CanvasDraw
                ref={canvasDrawRef}
                width={720}
                height={540}
                color={isEraser ? '#FFFFFF' : currentColor}
                lineWidth={lineWidth}
                isDrawingEnabled={isDrawer && gameState === 'playing'}
                onDraw={handleDraw}
              />
              {!isDrawer && gameState === 'playing' && (
                <div className="canvas-overlay">
                  <p>Bạn đang đoán...</p>
                </div>
              )}
            </div>

            {isDrawer && gameState === 'playing' && (
              <div className="drawing-tools">
                <input
                  type="color"
                  value={currentColor}
                  onChange={handleColorChange}
                  className="color-picker"
                />
                <button
                  onClick={handlePencil}
                  className={`tool-btn ${!isEraser ? 'active' : ''}`}
                >
                  Bút chì
                </button>
                <button
                  onClick={handleEraser}
                  className={`tool-btn ${isEraser ? 'active' : ''}`}
                >
                  Tẩy
                </button>
                <button onClick={handleClear} className="tool-btn">
                  Xóa
                </button>
              </div>
            )}
          </div>

          <div className="game-right">
            <Leaderboard players={players} currentUsername={username} />
          </div>
        </div>

        {/* Thông báo điểm khi đoán đúng */}
        {scoreNotification && (
          <div className="score-notification">
            <div className="score-notification-content">
              <div className="score-notification-icon">🎯</div>
              <div className="score-notification-text">
                <div className="score-notification-title">
                  {scoreNotification.type === 'guesser' ? 'Đoán đúng!' : 'Người vẽ nhận điểm!'}
                </div>
                <div className="score-notification-score">
                  +{scoreNotification.score} điểm
                </div>
              </div>
            </div>
          </div>
        )}

        {showEndGame && (
          <div className="end-game-overlay">
            <div className="end-game-box">
              <div className="end-game-header">
                <h1 className="end-game-title">🎉 Game Kết Thúc! 🎉</h1>
                {endGamePlayers.length > 0 && (
                  <div className="winner-announcement">
                    <div className="winner-crown">👑</div>
                    <h2 className="winner-name">{endGamePlayers[0].name}</h2>
                    <p className="winner-text">là Người Chiến Thắng!</p>
                    <div className="winner-score">{endGamePlayers[0].score} điểm</div>
                  </div>
                )}
              </div>
              
              <div className="podium">
                {endGamePlayers.slice(0, 3).map((player: any, idx: number) => {
                  const isCurrentUser = player.name === username;
                  return (
                    <div 
                      key={idx} 
                      className={`podium-item ${idx === 0 ? 'first-place' : ''} ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      <div className="podium-rank">
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                      </div>
                      <div className="podium-name">{player.name}</div>
                      <div className="podium-score">{player.score} điểm</div>
                      {isCurrentUser && <div className="podium-you">(Bạn)</div>}
                    </div>
                  );
                })}
              </div>
              
              {endGamePlayers.length > 3 && (
                <div className="other-players">
                  <h3>Người Chơi Khác</h3>
                  <div className="other-players-list">
                    {endGamePlayers.slice(3).map((player: any, idx: number) => {
                      const isCurrentUser = player.name === username;
                      return (
                        <div key={idx} className={`other-player-item ${isCurrentUser ? 'current-user' : ''}`}>
                          <span className="other-player-rank">#{idx + 4}</span>
                          <span className="other-player-name">{player.name} {isCurrentUser && '(Bạn)'}</span>
                          <span className="other-player-score">{player.score} điểm</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="end-game-footer">
                <p className="return-message">Đang chuyển về phòng...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;
