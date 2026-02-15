export type GamePhase =
  | 'LOBBY'
  | 'ROUND_START'
  | 'PLAYING'
  | 'VALIDATION'
  | 'ROUND_RESULTS'
  | 'FINAL_RESULTS';

export type ValidationMode = 'auto' | 'vote';

export interface Player {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  connected: boolean;
  totalScore: number;
}

export interface RoomSettings {
  timerSeconds: number;
  numRounds: number;
  numCategories: number;
  validationMode: ValidationMode;
}

export interface RoundAnswers {
  [playerId: string]: {
    [categoryIndex: number]: string;
  };
}

export interface VoteState {
  // categoryIndex -> playerId -> { voterId: boolean (true=accept) }
  [categoryIndex: number]: {
    [playerId: string]: {
      [voterId: string]: boolean;
    };
  };
}

export interface CategoryResult {
  playerId: string;
  answer: string;
  valid: boolean;
  duplicate: boolean;
  points: number;
}

export interface RoundResult {
  // categoryIndex -> CategoryResult[]
  [categoryIndex: number]: CategoryResult[];
}

export interface Room {
  code: string;
  players: Player[];
  settings: RoomSettings;
  phase: GamePhase;
  currentRound: number;
  currentLetter: string;
  currentCategories: string[];
  roundAnswers: RoundAnswers;
  submittedPlayers: Set<string>;
  voteState: VoteState;
  votedPlayers: Set<string>;
  roundResults: RoundResult;
  timerEndsAt: number | null;
  timerId: NodeJS.Timeout | null;
  usedLetters: string[];
}

export const DEFAULT_SETTINGS: RoomSettings = {
  timerSeconds: 90,
  numRounds: 3,
  numCategories: 12,
  validationMode: 'vote',
};
