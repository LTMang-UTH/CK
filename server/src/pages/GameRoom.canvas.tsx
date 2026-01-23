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
import type { GameProgress, ChooseWordData, ChatMessage } from '../types';
import './GameRoom.css';

const GameRoom = () => {
  const navigate = useNavigate();
  const canvasDrawRef = useRef<CanvasDrawRef>(null);
  const { username } = useAuthStore();
  const {
    roomId,
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

  const [wordSelectorWords, setWordSelectorWords] = useState<string[]>([]);
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [showWordChooseBox, setShowWordChooseBox] = useState(false);
  const [drawerName, setDrawerName] = useState('');
  const [wordHint, setWordHint] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEndTurn, setShowEndTurn] = useState(false);
  const [endTurnWord, setEndTurnWord] = useState('');
  const [showEndGame, setShowEndGame] = useState(false);
  const [endGamePlayers, setEndGamePlayers] = useState<any[]>([]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);

  // Lưu điểm trước để chuyển đổi format (gửi)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Lưu điểm trước khi nhận từ backend (nhận)
  const lastReceivedPointRef = useRef<{ x: number; y: number } | null>(null);

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
        setPlayers(data);
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
        reset();
        navigate('/');
      } else if (data.state === 'end_turn') {
        setShowEndTurn(true);
        setEndTurnWord(data.word || '');
        setTimeout(() => {
          setShowEndTurn(false);
        }, 5000);
      } else if (data.state === 'changing_turn') {
        setShowWordSelector(false);
        setShowWordChooseBox(false);
        if (canvasDrawRef.current) {
          canvasDrawRef.current.clear();
        }
      } else if (data.state === 'playing') {
        if (data.word) {
          setWordHint(data.word);
        }
      }
    };

    const handleChooseWord = (data: ChooseWordData | string) => {
      console.log('GameRoom chooseWord received:', data);
      const chooseData: ChooseWordData = typeof data === 'string' ? JSON.parse(data) : data;
      if (chooseData.state === 'you-selected') {
        setShowWordSelector(false);
        setIsDrawer(true);
        setShowWordChooseBox(false);
      } else if (chooseData.state === 'selected') {
        setShowWordSelector(false);
        setShowWordChooseBox(false);
      } else {
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
            lineWidth: payload.action === 'eraser' ? 10 : lineWidth,
            isDrawing: false,
          }];
        }

        // Vẽ từ start đến end
        const startX = payload.start?.X || 0;
        const startY = payload.start?.Y || 0;
        const endX = payload.end?.X || 0;
        const endY = payload.end?.Y || 0;
        const color = payload.color || '#000000';
        const width = payload.action === 'eraser' ? 10 : lineWidth;

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
      // Chỉ nhận nếu không phải drawer (tránh vẽ lại nét của chính mình)
      if (isDrawer) return;

      try {
        const payload = typeof data === 'string' ? JSON.parse(data) : data;
        const canvasDataArray = convertFromBackendFormat(payload);
        
        // Vẽ từng điểm trong mảng
        if (canvasDataArray.length > 0 && canvasDrawRef.current) {
          canvasDataArray.forEach((canvasData) => {
            canvasDrawRef.current?.receiveDraw(canvasData);
          });
        }
      } catch (error) {
        console.error('Failed to parse drawEvent:', error);
      }
    };

    const handleChatMessage = (data: string) => {
      const message: ChatMessage = JSON.parse(data);
      setChatMessages((prev: ChatMessage[]) => [...prev, message]);
    };

    const handleChatGuessed = (data: string) => {
      const message: ChatMessage = JSON.parse(data);
      setChatMessages((prev: ChatMessage[]) => [...prev, message]);
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
    socket.on('roomInfo', handleRoomInfo);
    socket.on('joinRoom', handleJoinRoomResponse);

    const setupAndJoin = () => {
      if (socket.connected) {
        console.log('GameRoom: Socket connected, emitting joinRoom for roomId:', roomId);
        socket.emit('joinRoom', { roomId });
        
        setTimeout(() => {
          socket.emit('playerList', { roomId });
          socket.emit('roomInfo', { roomId });
          console.log('GameRoom: Requesting room info to sync game state');
        }, 100);
      } else {
        socket.once('connect', () => {
          console.log('GameRoom: Socket connected, emitting joinRoom for roomId:', roomId);
          socket.emit('joinRoom', { roomId });
          
          setTimeout(() => {
            socket.emit('playerList', { roomId });
            socket.emit('roomInfo', { roomId });
            console.log('GameRoom: Requesting room info to sync game state');
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
      socket.off('roomInfo', handleRoomInfo);
      socket.off('joinRoom', handleJoinRoomResponse);
    };
  }, [roomId, isDrawer, navigate, setPlayers, setGameState, setTimeLeft, setCurrentWord, setCurrentRound, setTotalRounds, setIsDrawer, setGameStarted, reset, restoreFromStorage, lineWidth]);

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
    setCurrentColor(e.target.value);
    setIsEraser(false);
  };

  const handleEraser = () => {
    setIsEraser(true);
    setLineWidth(10);
  };

  const handlePencil = () => {
    setIsEraser(false);
    setLineWidth(5);
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
            <h2>No room found</h2>
            <button onClick={() => navigate('/')} className="btn-primary">
              Back to Main Menu
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
            <h2>Round {currentRound || 0}/{totalRounds || 3}</h2>
            <div className="timer">{formatTime(timeLeft || 0)}</div>
            {wordHint && <div className="word-hint">{wordHint}</div>}
          </div>
          <button onClick={() => navigate('/')} className="btn-link">
            Main Menu
          </button>
        </div>

        <div className="game-main">
          <div className="game-left">
            <div className="players-section">
              <h3>Players</h3>
              <div className="players-list">
                {players.map((player: any) => (
                  <PlayerCard
                    key={player.id}
                    playerName={player.name}
                    playerScore={player.score}
                  />
                ))}
              </div>
            </div>

            <div className="chat-section">
              <h3>Chat</h3>
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`chat-message ${msg.message === 'guessed' ? 'guessed' : ''}`}
                  >
                    <strong>{msg.sender}:</strong>{' '}
                    {msg.message === 'guessed' ? 'guessed the word!' : msg.message}
                  </div>
                ))}
              </div>
              <div className="chat-input-group">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder="Type a message..."
                  className="chat-input"
                />
                <button onClick={handleChatSend} className="btn-primary">
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="game-center">
            {showWordSelector && (
              <div className="word-selector-overlay" style={{ zIndex: 2000 }}>
                <div className="word-selector">
                  <h3>Choose a word:</h3>
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
                  <p>{drawerName} is choosing a word...</p>
                </div>
              </div>
            )}

            {showEndTurn && (
              <div className="end-turn-overlay">
                <div className="end-turn-box">
                  <h3>Turn Ended!</h3>
                  <p>The word was: {endTurnWord}</p>
                </div>
              </div>
            )}

            <div className="canvas-container">
              <CanvasDraw
                ref={canvasDrawRef}
                width={800}
                height={600}
                color={isEraser ? '#FFFFFF' : currentColor}
                lineWidth={lineWidth}
                isDrawingEnabled={isDrawer && gameState === 'playing'}
                onDraw={handleDraw}
              />
              {!isDrawer && gameState === 'playing' && (
                <div className="canvas-overlay">
                  <p>You are guessing...</p>
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
                  Pencil
                </button>
                <button
                  onClick={handleEraser}
                  className={`tool-btn ${isEraser ? 'active' : ''}`}
                >
                  Eraser
                </button>
                <button onClick={handleClear} className="tool-btn">
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {showEndGame && (
          <div className="end-game-overlay">
            <div className="end-game-box">
              <h2>Game Ended!</h2>
              <div className="podium">
                {endGamePlayers.slice(0, 3).map((player: any, idx: number) => (
                  <div key={idx} className="podium-item">
                    <div className="podium-rank">#{idx + 1}</div>
                    <div className="podium-name">{player.name}</div>
                    <div className="podium-score">{player.score} points</div>
                  </div>
                ))}
              </div>
              <p className="your-rank">
                You are #{endGamePlayers.findIndex((p: any) => p.name === username) + 1} with
                score of{' '}
                {(endGamePlayers.find((p: any) => p.name === username) as any)?.score || 0}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;

