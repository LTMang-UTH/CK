import { Server } from 'socket.io';
import { GameService, RoomState } from './game.service';
import { GameState } from './game.payload';

export class TurnService {
  private turns: Map<string, string[]> = new Map();
  public awaitSelectWords: string[] = [];
  private awaitSelectTime: Map<string, NodeJS.Timeout> = new Map();
  private nextTurnTime: Map<string, number> = new Map();
  public currentDrawer: Map<string, string> = new Map();
  public guessedPlayer: Map<string, string[]> = new Map();

  constructor(private readonly gameService: GameService) {}

  async startRound(roomId: string, server: Server): Promise<void> {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    room.currentRound++;

    if (room.currentRound > room.totalRounds) {
      this.endGame(roomId, server);
      return;
    }

    // Reset điểm số về 0 khi bắt đầu round đầu tiên (round 1) của game mới
    // Điều này đảm bảo điểm được reset khi bắt đầu game mới sau khi game cũ kết thúc
    if (room.currentRound === 1) {
      room.players.forEach(p => p.score = 0);
      console.log(roomId, `Round ${room.currentRound} started (NEW GAME). Scores reset to 0:`, room.players.map(p => `${p.name}: ${p.score}`));
    }

    const playerTurns = room.players.map((player) => player.id);
    this.turns.set(roomId, playerTurns);
    this.guessedPlayer.set(roomId, []);

    // QUAN TRỌNG: Điểm số KHÔNG bị reset khi bắt đầu round mới (round > 1)
    // Broadcast playerList với điểm cộng dồn (đã sắp xếp) khi bắt đầu round mới
    // Đảm bảo tất cả clients thấy điểm tổng được giữ nguyên, chỉ thứ hạng thay đổi
    this.gameService.updatePlayerList(roomId, server);
    if (room.currentRound > 1) {
      console.log(roomId, `Round ${room.currentRound} started. Scores preserved (NOT reset):`, room.players.map(p => `${p.name}: ${p.score}`));
    }

    this.changeTurn(roomId, server);
  }

  changeTurn(roomId: string, server: Server): void {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    if (this.turns.get(roomId)?.length == 0) {
      this.startRound(roomId, server);
      return;
    }

    room.state = 'changing_turn';
    
    // Send gameProgress to all players to notify state change
    server.to(roomId).emit('gameProgress', {
      state: 'changing_turn',
      timeLeft: 0,
    });
    
    // QUAN TRỌNG: Điểm số KHÔNG bị reset khi chuyển turn
    // Broadcast playerList với điểm cộng dồn (đã sắp xếp) khi chuyển turn
    // Đảm bảo tất cả clients thấy điểm tổng được giữ nguyên, chỉ thứ hạng thay đổi
    this.gameService.updatePlayerList(roomId, server);
    console.log(roomId, 'changing turn. Scores preserved (NOT reset):', room.players.map(p => `${p.name}: ${p.score}`));
    
    this.currentDrawer.set(roomId, '');
    this.guessedPlayer.set(roomId, []);

    // Small delay to ensure all clients receive the state change
    setTimeout(() => {
      this.chooseWord(roomId, server);
    }, 100);
  }

  chooseWord(roomId: string, server: Server): void {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    const drawer = this.turns.get(roomId)?.shift();
    if (!drawer) return;

    this.currentDrawer.set(roomId, drawer);
    this.guessedPlayer.get(roomId)?.push(drawer);

    // Clear currentWord trước khi chọn từ mới
    room.currentWord = null;

    const words = this.getRandomWords(room.words, room.wordsCount);
    this.awaitSelectWords = words;

    console.log(roomId, drawer, 'choosing a word from:', words);

    // Send chooseWord to drawer
    server.to(drawer).emit('chooseWord', {
      drawer: '#you',
      words,
      timeLeft: Date.now() + 15 * 1000,
      round: room.currentRound,
      totalRounds: room.totalRounds,
    });

    // Send chooseWord to all other players in the room
    // Use roomId to ensure all players in room receive the event
    room.players.forEach((player) => {
      if (player.id === drawer) return;
      server.to(player.id).emit('chooseWord', {
        drawer: this.gameService.connectedClients.get(drawer) || 'Someone',
        timeLeft: Date.now() + 15 * 1000,
        round: room.currentRound,
        totalRounds: room.totalRounds,
      });
    });
    
    // Also broadcast to entire room to catch any players who just joined
    server.to(roomId).emit('chooseWord', {
      drawer: this.gameService.connectedClients.get(drawer) || 'Someone',
      round: room.currentRound,
      totalRounds: room.totalRounds,
    });

    console.log(roomId, drawer, 'choosing a word...');

    // Lưu words vào biến local để đảm bảo closure giữ đúng giá trị
    const selectedWords = words;
    
    this.awaitSelectTime.set(
      roomId,
      setTimeout(() => {
        // Kiểm tra lại room và drawer
        const currentRoom = this.gameService.getRoom(roomId);
        if (!currentRoom) return;
        
        // Nếu chưa có từ được chọn, tự động chọn từ trong danh sách
        if (!currentRoom.currentWord) {
          // Chọn ngẫu nhiên 1 từ từ danh sách 3 từ đã gửi cho drawer
          const autoSelectedWord = this.getRandomWords(selectedWords, 1)[0];
          currentRoom.currentWord = autoSelectedWord;
          
          console.log(roomId, 'Auto-selected word after 15s timeout:', autoSelectedWord, 'from words:', selectedWords);
          
          server.to(drawer).emit('chooseWord', {
            state: 'you-selected',
            round: currentRoom.currentRound,
            totalRounds: currentRoom.totalRounds,
          });
          
          currentRoom.players.forEach((player) => {
            if (player.id === drawer) return;
            console.log(roomId, 'word selected:', currentRoom.currentWord);
            server.to(player.id).emit('chooseWord', {
              state: 'selected',
              round: currentRoom.currentRound,
              totalRounds: currentRoom.totalRounds,
            });
          });
        }
        this.startTurn(roomId, server);
      }, 15 * 1000)
    );
  }

  startTurn(roomId: string, server: Server): void {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    clearTimeout(this.awaitSelectTime.get(roomId));
    this.awaitSelectTime.delete(roomId);

    // Xóa lịch sử vẽ khi bắt đầu turn mới
    room.drawingHistory = [];

    room.state = 'playing';
    this.nextTurnTime.set(
      roomId,
      Date.now() + (room.turnDuration + 2) * 1000
    );

    const word = Array(room.currentWord?.length).fill('_');
    const _reveal = [...Array(room.currentWord?.length).keys()];

    // Send initial gameProgress to all players
    const initialTimeLeft = room.turnDuration + 2;
    const drawerId = this.currentDrawer.get(roomId);
    
    // Send to drawer (they see the full word)
    if (drawerId) {
      server.to(drawerId).emit('gameProgress', {
        state: 'playing',
        timeLeft: initialTimeLeft,
        word: room.currentWord,
      });
    }

    // Send to other players (they see the hint)
    room.players.forEach((player) => {
      if (player.id === drawerId) return;
      if (this.guessedPlayer.get(roomId)?.includes(player.id)) {
        // Already guessed players see full word
        server.to(player.id).emit('gameProgress', {
          state: 'playing',
          timeLeft: initialTimeLeft,
          word: room.currentWord,
        });
      } else {
        // Others see hint
        server.to(player.id).emit('gameProgress', {
          state: 'playing',
          timeLeft: initialTimeLeft,
          word: word.join(''),
        });
      }
    });
    
    // Also broadcast to entire room to catch any players who just joined
    // This ensures all players receive the initial game state
    // Note: We send the masked word, clients will handle showing full word to drawer
    server.to(roomId).emit('gameProgress', {
      state: 'playing',
      timeLeft: initialTimeLeft,
      word: word.join(''), // Send masked word, drawer will get full word from separate emit above
    });

    room.turnTimer = setInterval(() => {
      const timeLeft = Math.floor(
        ((this.nextTurnTime.get(roomId) ?? Date.now()) - Date.now()) / 1000
      );

      if (timeLeft <= 0) {
        if (room.turnTimer) {
          clearInterval(room.turnTimer);
        }
        this.endTurn(roomId, server);
        return;
      }

      if (timeLeft == (room.turnDuration * 3) / 4) {
        const randomIndex = Math.floor(Math.random() * _reveal.length);
        const indexToReveal = _reveal[randomIndex];

        word[indexToReveal] = room.currentWord
          ? room.currentWord[indexToReveal]
          : '';
        _reveal.splice(randomIndex, 1);
      }

      // Send to all players in room who haven't guessed
      room.players.forEach((player) => {
        if (this.guessedPlayer.get(roomId)?.includes(player.id)) return;
        server.to(player.id).emit('gameProgress', {
          state: 'playing',
          timeLeft: timeLeft,
          word: word.join(''),
        });
      });

      // Send to players who have guessed (they see the full word)
      this.guessedPlayer.get(roomId)?.forEach((player) => {
        server.to(player).emit('gameProgress', {
          state: 'playing',
          timeLeft: timeLeft,
          word: room.currentWord,
        });
      });

      // Also send to drawer (they see the full word)
      const drawerId = this.currentDrawer.get(roomId);
      if (drawerId) {
        server.to(drawerId).emit('gameProgress', {
          state: 'playing',
          timeLeft: timeLeft,
          word: room.currentWord,
        });
      }
    }, 1000);
  }

  answerHandler(
    roomId: string,
    server: Server,
    playerId: string,
    word: string
  ): { success: boolean; guesserScore?: number; drawerScore?: number } {
    const room = this.gameService.getRoom(roomId);
    if (!room) return { success: false };

    // So sánh không phân biệt hoa thường
    const normalizedWord = word.trim().toLowerCase();
    const normalizedCurrentWord = room.currentWord?.trim().toLowerCase() || '';

    if (normalizedWord === normalizedCurrentWord) {
      // Tính điểm TRƯỚC KHI giảm thời gian để đảm bảo điểm chính xác
      const scores = this.calculateScores(roomId, server, playerId);
      
      // Sau đó mới giảm thời gian
      this.reduceTime(roomId);
      
      // Thêm vào danh sách đã đoán đúng
      this.guessedPlayer.get(roomId)?.push(playerId);

      if (this.guessedPlayer.get(roomId)?.length == room.players.length) {
        this.endTurn(roomId, server);
      }
      return { success: true, guesserScore: scores.guesserScore, drawerScore: scores.drawerScore };
    }
    return { success: false };
  }

  endTurn(roomId: string, server: Server): void {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    room.state = 'end_turn';
    if (room.turnTimer) {
      clearInterval(room.turnTimer);
    }

    // QUAN TRỌNG: Điểm số KHÔNG bị reset, chỉ sắp xếp lại thứ hạng
    // Broadcast playerList với điểm cộng dồn (đã sắp xếp) sau khi kết thúc turn
    // Đảm bảo tất cả clients thấy điểm tổng được giữ nguyên, chỉ thứ hạng thay đổi
    this.gameService.updatePlayerList(roomId, server);

    server.to(roomId).emit('gameProgress', {
      state: room.state,
      word: room.currentWord,
    });

    console.log(roomId, 'turn ended. Scores preserved (NOT reset):', room.players.map(p => `${p.name}: ${p.score}`));

    setTimeout(() => {
      if (room.turnTimer) {
        clearInterval(room.turnTimer);
      }
      this.changeTurn(roomId, server);
    }, 5000);
  }

  endGame(roomId: string, server: Server): void {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    // Sắp xếp players theo điểm giảm dần
    const sortedPlayers = room.players.sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    room.state = 'ending';
    server.to(roomId).emit('gameProgress', {
      state: room.state,
      players: sortedPlayers,
      winner: winner, // Thêm thông tin người chiến thắng
    });

    console.log(roomId, 'game ended. Winner:', winner?.name, 'with', winner?.score, 'points');

    // Sau 8 giây hiển thị thông báo, chuyển về phòng cũ (không xóa phòng)
    setTimeout(() => {
      room.state = 'end';
      // Chuyển phòng về trạng thái 'waiting' để players có thể chơi lại
      room.state = 'waiting';
      room.currentRound = 0;
      room.currentWord = null;
      
      // Reset scores về 0 cho game mới (hoặc giữ nguyên nếu muốn tích lũy)
      // room.players.forEach(p => p.score = 0);
      
      server.to(roomId).emit('gameProgress', { 
        state: 'end',
        returnToRoom: true, // Signal để frontend biết chuyển về phòng
      });
      
      // Không xóa phòng, chỉ reset state
      console.log(roomId, 'game ended, returning to room. Players can start a new game.');
    }, 8000); // 8 giây để hiển thị thông báo đẹp
  }

  reduceTime(roomId: string): void {
    const room = this.gameService.getRoom(roomId);
    if (!room) return;

    const _nextTurnTime = this.nextTurnTime.get(roomId) ?? null;
    if (!_nextTurnTime) return;

    const timeLeft = _nextTurnTime - Date.now();
    const reducedTime = (timeLeft * 3) / 4;
    if (reducedTime <= 30) return;

    this.nextTurnTime.set(roomId, Date.now() + reducedTime);
  }

  /**
   * Tính điểm và cộng dồn vào tổng điểm của người chơi
   * Điểm được cộng dồn qua tất cả các lần đoán trúng trong toàn bộ game
   * - Guesser: nhận điểm = thời gian còn lại (tính bằng giây)
   * - Drawer: nhận điểm = 1/2 điểm của guesser
   * 
   * @param roomId - ID của phòng
   * @param server - Socket.IO Server instance
   * @param player - Socket ID của người chơi đoán đúng
   * @returns Object chứa guesserScore và drawerScore để gửi cho frontend
   */
  calculateScores(roomId: string, server: Server, player: string): { guesserScore: number; drawerScore: number } {
    const room = this.gameService.getRoom(roomId);
    if (!room) return { guesserScore: 0, drawerScore: 0 };

    const nextTurnTime = this.nextTurnTime.get(roomId);
    if (!nextTurnTime) {
      console.warn(`calculateScores: No nextTurnTime found for room ${roomId}`);
      return { guesserScore: 0, drawerScore: 0 };
    }

    // Tính thời gian còn lại tại thời điểm hiện tại (trước khi giảm)
    const timeLeft = Math.floor((nextTurnTime - Date.now()) / 1000);
    
    // Đảm bảo timeLeft không âm
    if (timeLeft <= 0) {
      console.warn(`calculateScores: TimeLeft is ${timeLeft}, skipping score calculation`);
      return { guesserScore: 0, drawerScore: 0 };
    }

    const guesserScore = timeLeft;
    const drawerScore = Math.floor(guesserScore / 2);

    console.log(`calculateScores: Player ${player} guessed correctly. TimeLeft: ${timeLeft}s, GuesserScore: ${guesserScore}, DrawerScore: ${drawerScore}`);

    const drawerId = this.currentDrawer.get(roomId);
    
    // Cộng dồn điểm vào tổng điểm của người chơi (không reset)
    // Điểm này sẽ được tích lũy qua tất cả các rounds và turns
    room.players.forEach((p) => {
      if (p.id === drawerId && drawerId) {
        const oldScore = p.score;
        p.score += drawerScore; // Cộng dồn điểm drawer
        console.log(`calculateScores: Drawer ${p.name} (${p.id}) score: ${oldScore} + ${drawerScore} = ${p.score} (TỔNG ĐIỂM CỘNG DỒN)`);
      }
      if (p.id === player) {
        const oldScore = p.score;
        p.score += guesserScore; // Cộng dồn điểm guesser
        console.log(`calculateScores: Guesser ${p.name} (${p.id}) score: ${oldScore} + ${guesserScore} = ${p.score} (TỔNG ĐIỂM CỘNG DỒN)`);
      }
    });

    // Broadcast danh sách players đã được sắp xếp theo điểm giảm dần
    this.gameService.updatePlayerList(roomId, server);

    return { guesserScore, drawerScore };
  }

  getRandomWords(arr: string[], count: number): string[] {
    const unique = [...new Set(arr)];
    if (unique.length < count) return [];
    return unique.sort(() => Math.random() - 0.5).slice(0, count);
  }
}

