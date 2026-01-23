import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { TurnService } from './turn.service';
import { PayloadEvent } from './game.payload';
import RedisService from '../services/redis.service';
import { UsersService } from '../services/users.service';
import { JWTService } from '../services/jwt.service';

export class GameGateway {
  private gameService: GameService;
  private turnService: TurnService;

  constructor(io: Server) {
    this.gameService = new GameService();
    this.turnService = new TurnService(this.gameService);

    const gameNamespace = io.of('/game');

    gameNamespace.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.query.token as string;
        if (!token) {
          socket.emit('error', {
            error: 'Unauthorized',
            message: 'Unauthorized!',
          });
          socket.disconnect();
          return;
        }

        // Verify JWT first
        const decoded = JWTService.verifyToken(token);
        if (!decoded) {
          socket.emit('error', {
            error: 'Unauthorized',
            message: 'Invalid token!',
          });
          socket.disconnect();
          return;
        }

        // Check token in Redis or Database
        const userId = await JWTService.verifyTokenInRedis(token);
        if (!userId || userId !== decoded.id) {
          socket.emit('error', {
            error: 'Unauthorized',
            message: 'Invalid token!',
          });
          socket.disconnect();
          return;
        }

        const user = await UsersService.findById(userId);
        if (!user) {
          socket.emit('error', {
            error: 'Unauthorized',
            message: 'Invalid token!',
          });
          socket.disconnect();
          return;
        }

        this.gameService.connectedClients.set(socket.id, user.username);
        next();
      } catch (error) {
        socket.emit('error', {
          error: 'Unauthorized',
          message: 'Invalid token!',
        });
        socket.disconnect();
      }
    });

    gameNamespace.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${this.gameService.connectedClients.get(socket.id)} (${socket.id})`);
      socket.emit('ping', 'pong');

      socket.on('disconnect', async () => {
        const room = await this.gameService.getPlayerRoomOnDisconnect(socket.id);
        if (room) {
          // Chỉ xóa phòng nếu host rời khi đang ở trạng thái 'waiting'
          // Nếu game đang chơi, chỉ remove player khỏi danh sách, game vẫn tiếp tục
          if (room.state === 'waiting' && room.host === socket.id) {
            console.log('Room ID:', room.id, 'was deleted because host left the room');
            gameNamespace.to(room.id).emit('roomClosed', 'Host left the room');
            this.gameService.deleteRoom(room.id);
            return;
          }
          
          // Nếu game đang chơi, chỉ remove player nhưng không xóa phòng
          // Game sẽ tiếp tục với các players còn lại
          await this.gameService.removePlayer(room.id, socket.id);
          const updatedRoom = this.gameService.getRoom(room.id);
          if (updatedRoom) {
            gameNamespace.to(room.id).emit('playerList', updatedRoom.players);
            console.log(`Player disconnected during game. Room ${room.id} continues with ${updatedRoom.players.length} players`);
          }
        }
        console.log(`Client disconnected: ${this.gameService.connectedClients.get(socket.id)} (${socket.id})`);
        this.gameService.connectedClients.delete(socket.id);
      });

      socket.on('createRoom', async () => {
        // Remove player from old room if exists
        const oldRoom = await this.gameService.getPlayerRoomOnDisconnect(socket.id);
        if (oldRoom) {
          await this.gameService.removePlayer(oldRoom.id, socket.id);
          socket.leave(oldRoom.id);
          gameNamespace.to(oldRoom.id).emit('playerList', oldRoom.players);
        }

        // Create new room
        const roomId = this.gameService.generateLobbyCode();
        const room = this.gameService.createRoom(socket, roomId);
        if (room) {
          const addPlayerResult = await this.gameService.addPlayer(roomId, socket.id);
          if (!addPlayerResult.success) {
            socket.emit('roomCreated', JSON.stringify({ error: 'Failed to add host to room' }));
            return;
          }
          
          // Get updated room after addPlayer
          const updatedRoom = this.gameService.getRoom(roomId);
          if (!updatedRoom) {
            socket.emit('roomCreated', JSON.stringify({ error: 'Failed to create room' }));
            return;
          }
          
          socket.join(roomId);
          
          // Create a clean room object without circular references
          const cleanRoom = {
            id: updatedRoom.id,
            host: updatedRoom.host,
            playersCount: updatedRoom.playersCount,
            players: updatedRoom.players,
            currentRound: updatedRoom.currentRound,
            totalRounds: updatedRoom.totalRounds,
            wordsCount: updatedRoom.wordsCount,
            hintsCount: updatedRoom.hintsCount,
            turnDuration: updatedRoom.turnDuration,
            currentWord: updatedRoom.currentWord,
            state: updatedRoom.state,
          };
          
          socket.emit('roomCreated', JSON.stringify(cleanRoom));
          // Send playerList to the host
          socket.emit('playerList', updatedRoom.players);
          console.log('Room Created:', roomId, 'with', updatedRoom.players.length, 'players');
        }
      });

      socket.on('updateRoomSettings', (data: {
        roomId: string;
        playersCount?: number;
        drawTime?: number;
        roundsCount?: number;
        wordsCount?: number;
        hintsCount?: number;
      }) => {
        const { roomId, playersCount, drawTime, roundsCount, wordsCount, hintsCount } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('updateRoomSettings', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        // Chỉ host mới được update settings
        if (room.host !== socket.id) {
          socket.emit('updateRoomSettings', JSON.stringify({ error: 'Only host can update room settings!' }));
          return;
        }

        // Validation: Không cho phép set Players Count nhỏ hơn số người hiện có
        if (playersCount !== undefined && playersCount < room.players.length) {
          socket.emit('updateRoomSettings', JSON.stringify({ 
            error: `Cannot set Players Count to ${playersCount} because there are currently ${room.players.length} players in the room. Please kick some players first.`,
            message: `Không thể đặt Players Count là ${playersCount} vì hiện có ${room.players.length} người trong phòng. Vui lòng đuổi một số người chơi trước.`
          }));
          console.log(`updateRoomSettings: Host tried to set playersCount to ${playersCount} but room has ${room.players.length} players`);
          return;
        }

        // Update room settings
        this.gameService.modifyRoom(roomId, {
          playersCount,
          totalRounds: roundsCount,
          turnDuration: drawTime,
          wordsCount,
          hintsCount,
        });

        console.log(`updateRoomSettings: Room ${roomId} settings updated by host, playersCount: ${playersCount || room.playersCount}`);
        socket.emit('updateRoomSettings', JSON.stringify({ success: true }));
      });

      socket.on('startGame', (data: {
        roomId: string;
        playersCount: number;
        drawTime: number;
        roundsCount: number;
        wordsCount: number;
        hintsCount: number;
      }) => {
        const { roomId, playersCount, drawTime, roundsCount, wordsCount, hintsCount } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('startGame', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        if (room.state !== 'waiting') {
          socket.emit('startGame', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        // Update room settings before starting game (in case they weren't updated before)
        this.gameService.modifyRoom(roomId, {
          playersCount,
          totalRounds: roundsCount,
          turnDuration: drawTime,
          wordsCount,
          hintsCount,
        });

        if (room.players.length < 2) {
          socket.emit('startGame', JSON.stringify({
            error: 'Cần ít nhất 2 người chơi để bắt đầu game!',
          }));
          return;
        }

        // Reset điểm số về 0 khi bắt đầu game mới (currentRound === 0)
        if (room.currentRound === 0) {
          room.players.forEach(p => p.score = 0);
          console.log(roomId, 'Starting new game, scores reset to 0:', room.players.map(p => `${p.name}: ${p.score}`));
        }

        gameNamespace.to(roomId).emit('startGame', JSON.stringify({ status: 'changing_round' }));
        console.log('Game started:', roomId);

        // Wait a bit longer to ensure all clients have navigated to game-room and setup listeners
        setTimeout(() => {
          this.turnService.startRound(roomId, gameNamespace);
        }, 2000);
      });

      socket.on('chooseWord', (data: { roomId: string; word: string }) => {
        const { roomId, word } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('chooseWord', { error: 'Room not found!' });
          return;
        }

        if (room.state !== 'changing_turn') {
          socket.emit('chooseWord', { error: 'Not selecting word!' });
          return;
        }

        if (!this.turnService.awaitSelectWords.includes(word)) {
          socket.emit('chooseWord', { error: 'Not in word selection list!' });
          return;
        }

        if (this.turnService.currentDrawer.get(roomId) !== socket.id) {
          socket.emit('chooseWord', { error: 'You are not the drawer!' });
          return;
        }

        room.currentWord = word;
        console.log(roomId, 'word selected:', room.currentWord);
        socket.emit('chooseWord', { state: 'you-selected' });

        room.players.forEach((player) => {
          if (player.id === socket.id) return;
          gameNamespace.to(player.id).emit('chooseWord', { state: 'selected' });
        });

        this.turnService.startTurn(roomId, gameNamespace);
      });

      socket.on('roomInfo', (data: { roomId: string }) => {
        const { roomId } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('roomInfo', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        // Get current drawer if game is in progress
        const currentDrawerId = this.turnService.currentDrawer.get(roomId);
        const isCurrentDrawer = currentDrawerId === socket.id;

        // Create a clean room object without circular references
        const cleanRoom = {
          id: room.id,
          host: room.host,
          playersCount: room.playersCount,
          players: room.players,
          currentRound: room.currentRound,
          totalRounds: room.totalRounds,
          wordsCount: room.wordsCount,
          hintsCount: room.hintsCount,
          turnDuration: room.turnDuration,
          currentWord: room.currentWord,
          state: room.state,
          isDrawer: isCurrentDrawer, // Add drawer info
          chatHistory: room.chatHistory || [], // Gửi lịch sử chat
        };

        socket.emit('roomInfo', JSON.stringify(cleanRoom));
      });

      socket.on('joinRoom', async (data: { roomId: string }) => {
        const { roomId } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('joinRoom', JSON.stringify({ error: 'Room not found!' }));
          console.log(`Room not found: ${roomId}`);
          return;
        }

        const playerName = this.gameService.connectedClients.get(socket.id);
        console.log(`joinRoom: ${playerName} (${socket.id}) attempting to join room ${roomId}, current players: ${room.players.length}/${room.playersCount}`);

        // KIỂM TRA: Chỉ cho phép join khi game ở trạng thái 'waiting' hoặc 'end'
        // Nếu game đang chơi, chỉ cho phép join lại nếu player đã có trong room (reload case)
        const isPlayerInRoom = room.players.some(p => p.name === playerName);
        const isGameActive = room.state !== 'waiting' && room.state !== 'end';
        
        if (isGameActive && !isPlayerInRoom) {
          // Game đang chơi và player chưa có trong room -> từ chối join
          socket.emit('joinRoom', JSON.stringify({ 
            error: 'Game đang diễn ra!', 
            message: 'Không thể tham gia phòng khi game đang hoạt động. Vui lòng đợi đến khi game kết thúc.' 
          }));
          console.log(`joinRoom: ${playerName} (${socket.id}) tried to join room ${roomId} but game is in progress (state: ${room.state})`);
          return;
        }

        // Remove player from old room if exists (and different from new room)
        const oldRoom = await this.gameService.getPlayerRoomOnDisconnect(socket.id);
        if (oldRoom && oldRoom.id !== roomId) {
          await this.gameService.removePlayer(oldRoom.id, socket.id);
          socket.leave(oldRoom.id);
          gameNamespace.to(oldRoom.id).emit('playerList', oldRoom.players);
        }

        // IMPORTANT: Check if this player was the drawer BEFORE filtering or calling addPlayer
        // Find drawer by checking room.players (which has username) instead of connectedClients
        const currentDrawerId = this.turnService.currentDrawer.get(roomId);
        let wasDrawer = false;
        if (currentDrawerId && playerName) {
          // Find the player with the old drawer socket.id in room.players
          // This MUST be done BEFORE filtering players, otherwise we lose the old socket.id
          const oldDrawerPlayer = room.players.find(p => p.id === currentDrawerId);
          if (oldDrawerPlayer && oldDrawerPlayer.name === playerName) {
            wasDrawer = true;
            console.log(`joinRoom: Player ${playerName} was the drawer (old socket.id: ${currentDrawerId})`);
          }
        }

        // QUAN TRỌNG: Lưu điểm số của player trước khi filter để không bị mất điểm
        // Tìm player với cùng username để lưu điểm số
        let preservedScore: number | null = null;
        if (playerName) {
          const existingPlayerWithScore = room.players.find(p => p.name === playerName);
          if (existingPlayerWithScore) {
            preservedScore = existingPlayerWithScore.score;
            console.log(`joinRoom: Preserving score ${preservedScore} for ${playerName}`);
          }
        }

        // Gọi addPlayer - nó sẽ xử lý tất cả logic:
        // 1. Filter duplicate players (same socket.id)
        // 2. Kiểm tra nếu player đã có (reload case) -> update socket.id
        // 3. Nếu player mới -> kiểm tra số lượng trước khi thêm
        const addPlayerResult = await this.gameService.addPlayer(roomId, socket.id);
        
        // Nếu addPlayer thất bại (room đầy), từ chối join
        if (!addPlayerResult.success) {
          const currentRoom = this.gameService.getRoom(roomId);
          const maxPlayers = currentRoom?.playersCount || 0;
          socket.emit('joinRoom', JSON.stringify({ 
            error: addPlayerResult.error || 'Phòng đã đầy!', 
            message: addPlayerResult.error || `Phòng đã đầy! Tối đa ${maxPlayers} người chơi được phép.` 
          }));
          console.log(`joinRoom: ${playerName} (${socket.id}) tried to join room ${roomId} but ${addPlayerResult.error}`);
          return;
        }
        
        // QUAN TRỌNG: Khôi phục điểm số nếu player đã tồn tại (reload case)
        // Nếu preservedScore không null, nghĩa là player đã có điểm số trước đó
        if (preservedScore !== null && playerName) {
          const updatedRoom = this.gameService.getRoom(roomId);
          if (updatedRoom) {
            const playerToUpdate = updatedRoom.players.find(p => p.name === playerName);
            if (playerToUpdate) {
              // Chỉ khôi phục điểm nếu player hiện tại có điểm = 0 (mới được tạo)
              // Hoặc nếu điểm hiện tại nhỏ hơn điểm đã lưu (tránh ghi đè điểm mới hơn)
              if (playerToUpdate.score === 0 || playerToUpdate.score < preservedScore) {
                playerToUpdate.score = preservedScore;
                console.log(`joinRoom: Restored score ${preservedScore} for ${playerName} (was ${playerToUpdate.score})`);
              } else {
                console.log(`joinRoom: Keeping current score ${playerToUpdate.score} for ${playerName} (preserved was ${preservedScore})`);
              }
            }
          }
        }
        
        // Get updated room after addPlayer
        const updatedRoom = this.gameService.getRoom(roomId);
        if (!updatedRoom) {
          socket.emit('joinRoom', JSON.stringify({ error: 'Room not found!' }));
          return;
        }
        
        // IMPORTANT: If this player was the drawer, update currentDrawer to new socket.id
        if (wasDrawer && currentDrawerId) {
          console.log(`joinRoom: Updating currentDrawer from ${currentDrawerId} to ${socket.id} for ${playerName}`);
          this.turnService.currentDrawer.set(roomId, socket.id);
          // Also update guessedPlayer list if drawer was in it
          const guessedPlayers = this.turnService.guessedPlayer.get(roomId);
          if (guessedPlayers) {
            const drawerIndex = guessedPlayers.indexOf(currentDrawerId);
            if (drawerIndex !== -1) {
              guessedPlayers[drawerIndex] = socket.id;
            } else if (!guessedPlayers.includes(socket.id)) {
              guessedPlayers.push(socket.id);
            }
          }
        }
        
        console.log(`joinRoom: Room ${roomId} now has ${updatedRoom.players.length} players:`, updatedRoom.players.map(p => `${p.name} (${p.id})`));
        
        socket.join(roomId);
        
        // Get current drawer if game is in progress (after potential update)
        const updatedDrawerId = this.turnService.currentDrawer.get(roomId);
        const isCurrentDrawer = updatedDrawerId === socket.id;

        // Create a clean room object without circular references (turnTimer, words array, etc.)
        const cleanRoom = {
          id: updatedRoom.id,
          host: updatedRoom.host,
          playersCount: updatedRoom.playersCount,
          players: updatedRoom.players,
          currentRound: updatedRoom.currentRound,
          totalRounds: updatedRoom.totalRounds,
          wordsCount: updatedRoom.wordsCount,
          hintsCount: updatedRoom.hintsCount,
          turnDuration: updatedRoom.turnDuration,
          currentWord: updatedRoom.currentWord,
          state: updatedRoom.state,
          isDrawer: isCurrentDrawer, // Add drawer info
          drawingHistory: updatedRoom.drawingHistory || [], // Gửi lịch sử vẽ
          chatHistory: updatedRoom.chatHistory || [], // Gửi lịch sử chat
        };
        
        socket.emit('joinRoom', JSON.stringify(cleanRoom));
        
        // Gửi lại toàn bộ lịch sử vẽ cho client mới join/reload
        if (updatedRoom.drawingHistory && updatedRoom.drawingHistory.length > 0) {
          console.log(`joinRoom: Sending ${updatedRoom.drawingHistory.length} drawing events to ${playerName}`);
          updatedRoom.drawingHistory.forEach((drawEvent: any) => {
            socket.emit('drawEvent', JSON.stringify(drawEvent));
          });
        }
        
        // KHÔNG gửi lại chat history qua event chatMessage để tránh nhân đôi
        // Chat history đã được gửi trong cleanRoom object, frontend sẽ tự xử lý
        
        // IMPORTANT: Send playerList to ALL players in room, including the one that just joined
        // This ensures reloaded players get the updated list
        gameNamespace.to(roomId).emit('playerList', updatedRoom.players);
      });

      socket.on('drawEvent', (data: { roomId: string; payload: PayloadEvent }) => {
        const { roomId, payload } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('drawEvent', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        if (room.state !== 'playing') {
          socket.emit('drawEvent', JSON.stringify({ error: 'Not drawing!' }));
          return;
        }

        // Lưu vào lịch sử vẽ (trừ khi là clear, thì xóa toàn bộ lịch sử)
        if (payload.action === 'clear') {
          room.drawingHistory = [];
        } else {
          // Lưu drawing event vào history
          room.drawingHistory.push(payload);
          // Giới hạn số lượng events để tránh memory leak (tối đa 1000 events)
          if (room.drawingHistory.length > 1000) {
            room.drawingHistory = room.drawingHistory.slice(-1000);
          }
        }

        // Broadcast cho tất cả players trong room
        gameNamespace.to(roomId).emit('drawEvent', JSON.stringify(payload));
      });

      socket.on('leaveRoom', async (data: { roomId: string }) => {
        const { roomId } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          console.log(`leaveRoom: Room not found: ${roomId}`);
          return;
        }

        const playerName = this.gameService.connectedClients.get(socket.id);
        console.log(`leaveRoom: ${playerName} (${socket.id}) leaving room ${roomId}`);

        // If host leaves room while in waiting state, delete the room
        if (room.state === 'waiting' && room.host === socket.id) {
          console.log(`leaveRoom: Room ID: ${roomId} was deleted because host left the room`);
          gameNamespace.to(roomId).emit('roomClosed', 'Host left the room');
          this.gameService.deleteRoom(roomId);
          socket.leave(roomId);
          return;
        }

        // Remove player from room
        await this.gameService.removePlayer(roomId, socket.id);
        socket.leave(roomId);

        // Get updated room after removing player
        const updatedRoom = this.gameService.getRoom(roomId);
        if (updatedRoom) {
          // Broadcast updated player list to all remaining players
          gameNamespace.to(roomId).emit('playerList', updatedRoom.players);
          console.log(`leaveRoom: Room ${roomId} now has ${updatedRoom.players.length} players`);
        } else {
          // Room was deleted (no players left)
          console.log(`leaveRoom: Room ${roomId} was deleted (no players left)`);
        }
      });

      socket.on('playerList', (data: { roomId: string }) => {
        const { roomId } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('playerList', JSON.stringify({ error: 'Room not found!' }));
          console.log(`Room not found: ${roomId}`);
          return;
        }

        socket.emit('playerList', room.players);
      });

      socket.on('kickPlayer', async (data: { roomId: string; playerId: string }) => {
        const { roomId, playerId } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('kickPlayer', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        // Chỉ host mới được kick player
        if (room.host !== socket.id) {
          socket.emit('kickPlayer', JSON.stringify({ error: 'Only the host can kick players!' }));
          console.log(`kickPlayer: ${socket.id} tried to kick player but is not the host`);
          return;
        }

        // Không được kick chính mình
        if (playerId === socket.id) {
          socket.emit('kickPlayer', JSON.stringify({ error: 'You cannot kick yourself!' }));
          return;
        }

        // Kiểm tra player có trong room không
        const playerToKick = room.players.find(p => p.id === playerId);
        if (!playerToKick) {
          socket.emit('kickPlayer', JSON.stringify({ error: 'Player not found in room!' }));
          return;
        }

        const playerName = playerToKick.name;
        console.log(`kickPlayer: Host ${socket.id} is kicking player ${playerName} (${playerId}) from room ${roomId}`);

        // Remove player from room
        await this.gameService.removePlayer(roomId, playerId);
        
        // Emit event cho player bị kick
        gameNamespace.to(playerId).emit('kicked', JSON.stringify({
          message: 'Bạn đã bị đuổi khỏi phòng bởi chủ phòng',
          roomId,
        }));

        // Emit event cho các player còn lại trong room
        const updatedRoom = this.gameService.getRoom(roomId);
        if (updatedRoom) {
          gameNamespace.to(roomId).emit('playerKicked', JSON.stringify({
            playerName,
            message: `${playerName} đã bị đuổi khỏi phòng`,
          }));
          // Broadcast updated player list
          gameNamespace.to(roomId).emit('playerList', updatedRoom.players);
        }

        // Disconnect player from room (sử dụng socket.id để tìm socket)
        const kickedSocket = await gameNamespace.fetchSockets();
        const targetSocket = kickedSocket.find(s => s.id === playerId);
        if (targetSocket) {
          targetSocket.leave(roomId);
          console.log(`kickPlayer: Disconnected player ${playerName} (${playerId}) from room ${roomId}`);
        }

        console.log(`kickPlayer: Player ${playerName} (${playerId}) has been kicked from room ${roomId}`);
      });

      socket.on('chatMessage', (data: { roomId: string; message: string }) => {
        const { roomId, message } = data;
        const room = this.gameService.getRoom(roomId);

        if (!room) {
          socket.emit('chatMessage', JSON.stringify({ error: 'Room not found!' }));
          return;
        }

        if (room.state == 'playing') {
          // Kiểm tra xem người gửi có phải là drawer không
          const currentDrawerId = this.turnService.currentDrawer.get(roomId);
          const isDrawer = currentDrawerId === socket.id;

          // Người vẽ KHÔNG được chat khi game đang chơi
          if (isDrawer) {
            // Không gửi tin nhắn, drawer không thể chat
            return;
          }

          // Nếu người gửi đã đoán đúng, chỉ gửi cho những người đã đoán đúng (chat riêng)
          const guessedPlayer = this.turnService.guessedPlayer.get(roomId);
          if (guessedPlayer?.includes(socket.id)) {
            guessedPlayer.forEach((player) => {
              gameNamespace.to(player).emit('chatGuessed', JSON.stringify({
                message,
                sender: this.gameService.connectedClients.get(socket.id),
              }));
            });
            return;
          }

          // Kiểm tra xem tin nhắn có phải là đáp án đúng không
          const answerResult = this.turnService.answerHandler(roomId, gameNamespace, socket.id, message);
          if (answerResult.success) {
            const playerName = this.gameService.connectedClients.get(socket.id);
            const drawerId = this.turnService.currentDrawer.get(roomId);
            const drawerName = drawerId ? this.gameService.connectedClients.get(drawerId) : null;
            
            // Gửi thông báo đoán đúng cho tất cả players
            gameNamespace.to(roomId).emit('chatGuessed', JSON.stringify({
              message: 'guessed',
              sender: playerName,
            }));
            
            // Gửi thông báo điểm cho guesser (người đoán đúng)
            if (socket.id && answerResult.guesserScore) {
              gameNamespace.to(socket.id).emit('scoreNotification', JSON.stringify({
                score: answerResult.guesserScore,
                type: 'guesser',
              }));
            }
            
            // Gửi thông báo điểm cho drawer (người vẽ)
            if (drawerId && answerResult.drawerScore) {
              gameNamespace.to(drawerId).emit('scoreNotification', JSON.stringify({
                score: answerResult.drawerScore,
                type: 'drawer',
              }));
            }
            
            return;
          }

          // Nếu không phải đáp án đúng, vẫn cho phép người đoán gửi tin nhắn (chat tự do)
          // Gửi cho tất cả người chơi
          const senderName = this.gameService.connectedClients.get(socket.id);
          const chatData = {
            message,
            sender: senderName,
          };
          
          // Lưu vào lịch sử chat (kể cả khi game đang chơi)
          if (!room.chatHistory) {
            room.chatHistory = [];
          }
          room.chatHistory.push({
            sender: senderName || 'Unknown',
            message,
            timestamp: Date.now(),
          });
          // Giới hạn số lượng messages để tránh memory leak (tối đa 100 messages)
          if (room.chatHistory.length > 100) {
            room.chatHistory = room.chatHistory.slice(-100);
          }
          
          gameNamespace.to(roomId).emit('chatMessage', JSON.stringify(chatData));
        } else {
          // Nếu game không ở trạng thái 'playing', gửi tin nhắn cho tất cả (kể cả drawer)
          const senderName = this.gameService.connectedClients.get(socket.id);
          const chatData = {
            message,
            sender: senderName,
          };
          
          // Lưu vào lịch sử chat
          if (!room.chatHistory) {
            room.chatHistory = [];
          }
          room.chatHistory.push({
            sender: senderName || 'Unknown',
            message,
            timestamp: Date.now(),
          });
          // Giới hạn số lượng messages để tránh memory leak (tối đa 100 messages)
          if (room.chatHistory.length > 100) {
            room.chatHistory = room.chatHistory.slice(-100);
          }
          
          gameNamespace.to(roomId).emit('chatMessage', JSON.stringify(chatData));
        }
      });
    });
  }
}

