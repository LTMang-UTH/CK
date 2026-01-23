import { create } from 'zustand';
import type { GameState, Player, Room } from '../types';
import { LocalStorage } from '../services/storage';

interface GameStore {
  // Room state
  roomId: string;
  isHost: boolean;
  gameStarted: boolean;
  isDrawer: boolean;
  
  // Room data
  room: Room | null;
  players: Player[];
  
  // Game state
  currentWord: string | null;
  gameState: GameState;
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  
  // Actions
  setRoomId: (roomId: string) => void;
  setIsHost: (isHost: boolean) => void;
  setGameStarted: (started: boolean) => void;
  setIsDrawer: (isDrawer: boolean) => void;
  getIsDrawer: () => boolean;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setCurrentWord: (word: string | null) => void;
  setGameState: (state: GameState) => void;
  setTimeLeft: (time: number) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (rounds: number) => void;
  reset: () => void;
  restoreFromStorage: () => void;
}

const initialState = {
  roomId: '',
  isHost: false,
  gameStarted: false,
  isDrawer: false,
  room: null,
  players: [],
  currentWord: null,
  gameState: 'waiting' as GameState,
  timeLeft: 0,
  currentRound: 0,
  totalRounds: 3,
};

export const useGameStore = create<GameStore>((set) => ({
  // Initialize from sessionStorage to persist across reloads
  roomId: LocalStorage.getRoomId(),
  isHost: LocalStorage.getIsHost(),
  gameStarted: false,
  isDrawer: LocalStorage.getIsDrawer(),
  room: null,
  players: [],
  currentWord: null,
  gameState: 'waiting' as GameState,
  timeLeft: 0,
  currentRound: 0,
  totalRounds: 3,
  
  setRoomId: (roomId) => {
    LocalStorage.setRoomId(roomId);
    set({ roomId });
  },
  
  setIsHost: (isHost) => {
    LocalStorage.setIsHost(isHost);
    set({ isHost });
  },
  
  setGameStarted: (started) => set({ gameStarted: started }),
  setIsDrawer: (isDrawer) => {
    LocalStorage.setIsDrawer(isDrawer);
    set({ isDrawer });
  },
  getIsDrawer: () => LocalStorage.getIsDrawer(),
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setCurrentWord: (word) => set({ currentWord: word }),
  setGameState: (state) => set({ gameState: state }),
  setTimeLeft: (time) => set({ timeLeft: time }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setTotalRounds: (rounds) => set({ totalRounds: rounds }),
  
  reset: () => {
    LocalStorage.clearRoom();
    set(initialState);
  },
  
  restoreFromStorage: () => {
    const roomId = LocalStorage.getRoomId();
    const isHost = LocalStorage.getIsHost();
    const isDrawer = LocalStorage.getIsDrawer();
    if (roomId) {
      set({ roomId, isHost, isDrawer });
    }
  },
}));

