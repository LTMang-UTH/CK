import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import { useGameStore } from '../store/gameStore';
import { websocketService } from '../services/websocketService';
import { useAuthStore } from '../store/authStore';
import PlayerCard from '../components/PlayerCard';
import WordButton from '../components/WordButton';
import type { DrawingData, GameProgress, ChooseWordData, ChatMessage } from '../types';
import './GameRoom.css';

const GameRoom = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
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
  const [isEraser, setIsEraser] = useState(false);
  
  // Use refs to access latest values in event handlers without re-initializing canvas
  const currentColorRef = React.useRef(currentColor);
  const isEraserRef = React.useRef(isEraser);
  
  React.useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);
  
  React.useEffect(() => {
    isEraserRef.current = isEraser;
  }, [isEraser]);

  const sendDrawDataRef = React.useRef<(
    action: 'pencil' | 'eraser' | 'clear',
    start: fabric.Point,
    end: fabric.Point,
    color: string
  ) => void>();
  
  const sendDrawData = React.useCallback((
    action: 'pencil' | 'eraser' | 'clear',
    start: fabric.Point,
    end: fabric.Point,
    color: string
  ) => {
    const drawData: DrawingData = {
      action,
      start: { X: start.x, Y: start.y },
      end: { X: end.x, Y: end.y },
      color,
    };
    websocketService.emit('drawEvent', { roomId, payload: drawData });
  }, [roomId]);
  
  React.useEffect(() => {
    sendDrawDataRef.current = sendDrawData;
  }, [sendDrawData]);

  // Initialize Fabric Canvas - Only once, don't re-initialize on isDrawer change
  useEffect(() => {
    if (!canvasRef.current) return;

    // Check if fabric is available
    if (!fabric || !fabric.Canvas) {
      console.error('Fabric.js is not properly imported');
      return;
    }

    // Don't re-initialize if canvas already exists
    if (fabricCanvasRef.current) {
      return;
    }

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: 'white',
        isDrawingMode: false,
        selection: false,
      });

      // Disable default Fabric.js interactions
      (canvas as any).selection = false;
      (canvas as any).defaultCursor = 'crosshair';
      (canvas as any).hoverCursor = 'crosshair';
      (canvas as any).moveCursor = 'crosshair';
      
      // Ensure canvas is interactive
      (canvas as any).interactive = true;

      fabricCanvasRef.current = canvas;

      // Drawing handlers - use closure to access latest state
      let isDrawing = false;
      let lastPoint: fabric.Point | null = null;

      const handleMouseDown = (options: fabric.IEvent) => {
        // Use current isDrawer value from store
        const currentIsDrawer = useGameStore.getState().isDrawer;
        const currentGameState = useGameStore.getState().gameState;
        console.log('Canvas mouse:down, isDrawer:', currentIsDrawer, 'gameState:', currentGameState);
        if (!currentIsDrawer || currentGameState !== 'playing') {
          console.log('Canvas mouse:down blocked - isDrawer:', currentIsDrawer, 'gameState:', currentGameState);
          return;
        }
        isDrawing = true;
        const pointer = canvas.getPointer(options.e);
        lastPoint = new fabric.Point(pointer.x, pointer.y);
        console.log('Canvas mouse:down - started drawing at:', pointer.x, pointer.y);
      };

      const handleMouseMove = (options: fabric.IEvent) => {
        // Use current isDrawer value from store
        const currentIsDrawer = useGameStore.getState().isDrawer;
        const currentGameState = useGameStore.getState().gameState;
        if (!isDrawing || !currentIsDrawer || currentGameState !== 'playing' || !lastPoint) return;
        
        // Get current color and eraser state from refs (latest values)
        const currentColorValue = currentColorRef.current;
        const isEraserValue = isEraserRef.current;
        
        const pointer = canvas.getPointer(options.e);
        const currentPoint = new fabric.Point(pointer.x, pointer.y);

        if (isEraserValue) {
          // Eraser logic
          const line = new fabric.Line(
            [lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y],
            {
              stroke: 'white',
              strokeWidth: 10,
              selectable: false,
              evented: false,
            }
          );
          canvas.add(line);
          if (sendDrawDataRef.current) {
            sendDrawDataRef.current('eraser', lastPoint, currentPoint, '#FFFFFF');
          }
        } else {
          // Pencil logic
          const line = new fabric.Line(
            [lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y],
            {
              stroke: currentColorValue,
              strokeWidth: 5,
              selectable: false,
              evented: false,
            }
          );
          canvas.add(line);
          if (sendDrawDataRef.current) {
            sendDrawDataRef.current('pencil', lastPoint, currentPoint, currentColorValue);
          }
        }

        lastPoint = currentPoint;
        canvas.renderAll();
      };

      const handleMouseUp = () => {
        isDrawing = false;
        lastPoint = null;
      };

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);

      // Store handlers for cleanup
      (canvas as any)._drawingHandlers = {
        mouseDown: handleMouseDown,
        mouseMove: handleMouseMove,
        mouseUp: handleMouseUp,
      };
    } catch (error) {
      console.error('Failed to initialize Fabric Canvas:', error);
      return;
    }

    return () => {
      if (fabricCanvasRef.current) {
        const canvas = fabricCanvasRef.current;
        const handlers = (canvas as any)._drawingHandlers;
        if (handlers) {
          canvas.off('mouse:down', handlers.mouseDown);
          canvas.off('mouse:move', handlers.mouseMove);
          canvas.off('mouse:up', handlers.mouseUp);
        }
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []); // Only initialize once, don't depend on isDrawer, isEraser, currentColor

  // WebSocket event handlers - Setup once when component mounts
  useEffect(() => {
    // Restore roomId first
    restoreFromStorage();
    
    if (!roomId) {
      navigate('/');
      return;
    }

    // Ensure socket is connected first
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

    // Setup event listeners FIRST before emitting joinRoom
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
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.clear();
          fabricCanvasRef.current.backgroundColor = 'white';
          fabricCanvasRef.current.renderAll();
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
        setShowWordChooseBox(false); // Đảm bảo không hiển thị cho drawer
      } else if (chooseData.state === 'selected') {
        setShowWordSelector(false);
        setShowWordChooseBox(false);
      } else {
        if (chooseData.drawer === '#you') {
          setIsDrawer(true);
          setShowWordSelector(true);
          setWordSelectorWords(chooseData.words || []);
          setShowWordChooseBox(false); // Không hiển thị cho drawer
        } else {
          setIsDrawer(false);
          setShowWordChooseBox(true); // Chỉ hiển thị cho người đoán
          setDrawerName(chooseData.drawer || '');
        }
        if (chooseData.round) setCurrentRound(chooseData.round);
        if (chooseData.totalRounds) setTotalRounds(chooseData.totalRounds);
      }
    };

    const processDrawingMessage = (drawData: DrawingData) => {
      if (!fabricCanvasRef.current) return;

      switch (drawData.action) {
        case 'pencil': {
          const line = new fabric.Line(
            [drawData.start.X, drawData.start.Y, drawData.end.X, drawData.end.Y],
            {
              stroke: drawData.color,
              strokeWidth: 5,
              selectable: false,
            }
          );
          fabricCanvasRef.current.add(line);
          break;
        }
        case 'eraser': {
          const eraserLine = new fabric.Line(
            [drawData.start.X, drawData.start.Y, drawData.end.X, drawData.end.Y],
            {
              stroke: 'white',
              strokeWidth: 10,
              selectable: false,
            }
          );
          fabricCanvasRef.current.add(eraserLine);
          break;
        }
        case 'clear':
          fabricCanvasRef.current.clear();
          fabricCanvasRef.current.backgroundColor = 'white';
          break;
      }
      fabricCanvasRef.current.renderAll();
    };

    const handleDrawEvent = (data: string) => {
      if (isDrawer) return;
      const drawData: DrawingData = JSON.parse(data);
      processDrawingMessage(drawData);
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

        // Restore drawer state from backend if game is in progress
        if (roomInfo.isDrawer !== undefined) {
          console.log('GameRoom: Restoring isDrawer from roomInfo:', roomInfo.isDrawer);
          setIsDrawer(roomInfo.isDrawer);
        }

        // Restore game state if game is in progress
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

    // Handle joinRoom response to restore drawer state
    const handleJoinRoomResponse = (data: string) => {
      try {
        const roomData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('GameRoom joinRoom response received:', roomData);
        
        if (roomData.error) {
          console.error('Join room error:', roomData.error);
          return;
        }

        // Restore drawer state from backend if game is in progress
        if (roomData.isDrawer !== undefined) {
          console.log('GameRoom: Restoring isDrawer from joinRoom:', roomData.isDrawer);
          setIsDrawer(roomData.isDrawer);
        }

        // Restore game state if game is in progress
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

    // Wait for socket to be connected before emitting
    const setupAndJoin = () => {
      if (socket.connected) {
        console.log('GameRoom: Socket connected, emitting joinRoom for roomId:', roomId);
        socket.emit('joinRoom', { roomId });
        
        // Request initial data after a short delay to ensure we get current game state
        setTimeout(() => {
          socket.emit('playerList', { roomId });
          socket.emit('roomInfo', { roomId });
          
          // If game has already started, request current game state
          // This ensures we don't miss chooseWord or gameProgress events
          console.log('GameRoom: Requesting room info to sync game state');
        }, 100);
      } else {
        // Wait for connect event
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
  }, [roomId, isDrawer, navigate, setPlayers, setGameState, setTimeLeft, setCurrentWord, setCurrentRound, setTotalRounds, setIsDrawer, setGameStarted, reset, restoreFromStorage]);

  const handleClear = () => {
    if (!fabricCanvasRef.current || !isDrawer) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = 'white';
    fabricCanvasRef.current.renderAll();
    if (sendDrawDataRef.current) {
      sendDrawDataRef.current('clear', new fabric.Point(0, 0), new fabric.Point(0, 0), '#FFFFFF');
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentColor(e.target.value);
    setIsEraser(false);
  };

  const handleEraser = () => {
    setIsEraser(true);
  };

  const handlePencil = () => {
    setIsEraser(false);
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

  // Debug: Log current state
  useEffect(() => {
    console.log('GameRoom state:', {
      roomId,
      gameState,
      timeLeft,
      currentRound,
      totalRounds,
      isDrawer,
      players: players.length,
      showWordSelector,
      showWordChooseBox,
    });
  }, [roomId, gameState, timeLeft, currentRound, totalRounds, isDrawer, players, showWordSelector, showWordChooseBox]);


  // Show loading state if game hasn't started yet
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
              <canvas 
                ref={canvasRef} 
                style={{ 
                  pointerEvents: isDrawer && gameState === 'playing' ? 'auto' : 'auto',
                  cursor: isDrawer && gameState === 'playing' ? 'crosshair' : 'default'
                }} 
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

