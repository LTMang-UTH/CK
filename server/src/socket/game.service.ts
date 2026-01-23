import { Server, Socket } from 'socket.io';
import { GameState, wordsList } from './game.payload';
import RedisService from '../services/redis.service';

export interface RoomState {
  id: string;
  host: string;
  playersCount: number;
  players: {
    id: string;
    score: number;
    name: string;
  }[];
  currentRound: number;
  totalRounds: number;
  wordsCount: number;
  hintsCount: number;
  turnTimer: NodeJS.Timeout | null;
  turnDuration: number;
  words: string[];
  currentWord: string | null;
  state: GameState;
  drawingHistory: any[]; // Lưu lịch sử các nét vẽ để khôi phục khi reload
  chatHistory: Array<{ sender: string; message: string; timestamp: number }>; // Lưu lịch sử chat để khôi phục khi reload
}

export class GameService {
  public connectedClients: Map<string, string> = new Map();
  private rooms: Map<string, RoomState> = new Map();

  createRoom(host: Socket, roomId: string): RoomState | null {
    if (!host.id) return null;

    const room: RoomState = {
      id: roomId,
      host: host.id,
      playersCount: 8,
      players: [],
      currentRound: 0,
      totalRounds: 3,
      wordsCount: 3,
      hintsCount: 2,
      turnTimer: null,
      turnDuration: 120,
      words: wordsList,
      currentWord: null,
      state: 'waiting',
      drawingHistory: [], // Khởi tạo lịch sử vẽ rỗng
      chatHistory: [], // Khởi tạo lịch sử chat rỗng
    };

    this.rooms.set(roomId, room);
    return this.getRoom(roomId);
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  modifyRoom(
    roomId: string,
    changes: Partial<{
      playersCount: number;
      totalRounds: number;
      turnDuration: number;
      wordsCount: number;
      hintsCount: number;
    }>
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (changes.playersCount) room.playersCount = changes.playersCount;
    if (changes.totalRounds) room.totalRounds = changes.totalRounds;
    if (changes.turnDuration) room.turnDuration = changes.turnDuration;
    if (changes.wordsCount) room.wordsCount = changes.wordsCount;
    if (changes.hintsCount) room.hintsCount = changes.hintsCount;

    return true;
  }

  async addPlayer(roomId: string, player: string): Promise<{ success: boolean; isNewPlayer: boolean; error?: string }> {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, isNewPlayer: false, error: 'Room not found' };

    const playerName = this.connectedClients.get(player) || 'Player';
    
    // BƯỚC 1: Remove any player with the same socket.id (in case of duplicate from same socket)
    room.players = room.players.filter(p => p.id !== player);
    
    // BƯỚC 2: Check if player with same username already exists (for reload case)
    const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);
    if (existingPlayerIndex !== -1) {
      // Player đã có trong room (reload case) -> chỉ update socket.id
      const existingPlayer = room.players[existingPlayerIndex];
      const oldScore = existingPlayer.score; // Lưu điểm số cũ
      existingPlayer.id = player; // Update socket.id
      existingPlayer.score = oldScore; // Giữ nguyên điểm số
      console.log(`addPlayer: Updated socket.id for existing player ${playerName}, preserved score: ${oldScore}, current count: ${room.players.length}/${room.playersCount}`);
      await RedisService.set(`playerRoom:${player}`, roomId);
      return { success: true, isNewPlayer: false };
    }
    
    // BƯỚC 3: Player mới -> kiểm tra số lượng TRƯỚC KHI thêm
    // QUAN TRỌNG: Kiểm tra số lượng SAU KHI đã filter duplicate socket.id
    if (room.players.length >= room.playersCount) {
      console.log(`addPlayer: Cannot add NEW player ${playerName}, room is FULL (${room.players.length}/${room.playersCount})`);
      return { success: false, isNewPlayer: true, error: `Phòng đã đầy! Tối đa ${room.playersCount} người chơi được phép.` };
    }
    
    // BƯỚC 4: Thêm player mới
    room.players.push({
      id: player,
      score: 0,
      name: playerName,
    });
    console.log(`addPlayer: Added NEW player ${playerName} with score 0, new count: ${room.players.length}/${room.playersCount}`);
    await RedisService.set(`playerRoom:${player}`, roomId);
    return { success: true, isNewPlayer: true };
  }

  async removePlayer(roomId: string, player: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.players = room.players.filter((p) => p.id !== player);
    if (room.players.length === 0) {
      this.deleteRoom(roomId);
      console.log(roomId, 'deleted due to not having any players.');
    }
    return true;
  }

  updateRoomState(roomId: string, newState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.state = newState;
    }
  }

  updatePlayerList(roomId: string, server: Server): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Sắp xếp players theo điểm giảm dần trước khi gửi
      const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
      server.to(roomId).emit('playerList', sortedPlayers);
    }
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room?.turnTimer) {
      clearTimeout(room.turnTimer);
    }
    this.rooms.delete(roomId);
  }

  async getPlayerRoomOnDisconnect(player: string): Promise<RoomState | null> {
    const roomId = await RedisService.get(`playerRoom:${player}`);
    if (!roomId) return null;
    const room = this.getRoom(roomId);
    if (!room) return null;
    return room;
  }

  generateLobbyCode(): string {
    return Array.from({ length: 8 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(
        Math.floor(Math.random() * 36)
      )
    ).join('');
  }
}

