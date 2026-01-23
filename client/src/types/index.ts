// User Types
export interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  avatar: string | null;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  data: {
    user: UserData;
    accessToken: string;
  };
}

export interface UserProfile {
  statusCode: number;
  data: UserData;
}

// Game Types
export type GameState = 
  | 'waiting'
  | 'changing_turn'
  | 'playing'
  | 'end_turn'
  | 'ending'
  | 'end';

export interface Player {
  id: string;
  score: number;
  name: string;
}

export interface Room {
  id: string;
  host: string;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  wordsCount: number;
  hintsCount: number;
  turnDuration: number;
  currentWord: string | null;
  state: GameState;
}

export interface GameProgress {
  state: GameState;
  word?: string;
  timeLeft?: number;
  players?: Player[];
}

export interface ChooseWordData {
  drawer: string;
  words?: string[];
  timeLeft?: number;
  round?: number;
  totalRounds?: number;
  state?: 'you-selected' | 'selected';
}

export interface DrawingData {
  action: 'pencil' | 'eraser' | 'clear';
  start: { X: number; Y: number };
  end: { X: number; Y: number };
  color: string;
}

export interface ChatMessage {
  sender: string;
  message: string;
}

// Session Types
export interface SessionData {
  accessToken: string;
  username: string;
}

