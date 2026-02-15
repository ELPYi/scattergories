import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { socket } from '../socket';
import {
  GamePhase,
  Player,
  RoomSettings,
  CategoryResult,
  PlayerScore,
} from '../lib/constants';

interface GameState {
  phase: GamePhase;
  playerId: string | null;
  roomCode: string | null;
  players: Player[];
  settings: RoomSettings;
  currentRound: number;
  totalRounds: number;
  currentLetter: string;
  categories: string[];
  timerEndsAt: number | null;
  submittedCount: number;
  // Validation
  answersForVoting: {
    [playerId: string]: { nickname: string; answers: { [catIndex: number]: string } };
  } | null;
  votedCount: number;
  // Results
  roundResults: { [catIndex: number]: CategoryResult[] } | null;
  playerScores: PlayerScore[];
  error: string | null;
}

type Action =
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'JOINED_ROOM'; playerId: string; roomCode: string; players: Player[]; settings: RoomSettings }
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_LEFT'; players: Player[] }
  | { type: 'SETTINGS_UPDATED'; settings: RoomSettings }
  | { type: 'ROUND_START'; round: number; totalRounds: number; letter: string; categories: string[] }
  | { type: 'PLAYING'; timerEndsAt: number }
  | { type: 'PLAYER_SUBMITTED'; submittedCount: number }
  | { type: 'TIME_UP' }
  | { type: 'VALIDATION_START'; answers: any; categories: string[]; letter: string }
  | { type: 'PLAYER_VOTED'; votedCount: number }
  | { type: 'ROUND_RESULTS'; roundResults: any; players: PlayerScore[]; currentRound: number; totalRounds: number }
  | { type: 'FINAL_RESULTS'; roundResults: any; players: PlayerScore[] }
  | { type: 'PLAY_AGAIN'; players: Player[] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

const initialState: GameState = {
  phase: 'LANDING',
  playerId: null,
  roomCode: null,
  players: [],
  settings: { timerSeconds: 90, numRounds: 3, numCategories: 12, validationMode: 'vote' },
  currentRound: 0,
  totalRounds: 3,
  currentLetter: '',
  categories: [],
  timerEndsAt: null,
  submittedCount: 0,
  answersForVoting: null,
  votedCount: 0,
  roundResults: null,
  playerScores: [],
  error: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'JOINED_ROOM':
      return {
        ...state,
        phase: 'LOBBY',
        playerId: action.playerId,
        roomCode: action.roomCode,
        players: action.players,
        settings: action.settings,
        error: null,
      };
    case 'PLAYER_JOINED':
      return { ...state, players: [...state.players, action.player] };
    case 'PLAYER_LEFT':
      return { ...state, players: action.players };
    case 'SETTINGS_UPDATED':
      return { ...state, settings: action.settings };
    case 'ROUND_START':
      return {
        ...state,
        phase: 'ROUND_START',
        currentRound: action.round,
        totalRounds: action.totalRounds,
        currentLetter: action.letter,
        categories: action.categories,
        submittedCount: 0,
        roundResults: null,
      };
    case 'PLAYING':
      return { ...state, phase: 'PLAYING', timerEndsAt: action.timerEndsAt };
    case 'PLAYER_SUBMITTED':
      return { ...state, submittedCount: action.submittedCount };
    case 'TIME_UP':
      return { ...state, timerEndsAt: null };
    case 'VALIDATION_START':
      return {
        ...state,
        phase: 'VALIDATION',
        answersForVoting: action.answers,
        votedCount: 0,
      };
    case 'PLAYER_VOTED':
      return { ...state, votedCount: action.votedCount };
    case 'ROUND_RESULTS':
      return {
        ...state,
        phase: 'ROUND_RESULTS',
        roundResults: action.roundResults,
        playerScores: action.players,
        currentRound: action.currentRound,
        totalRounds: action.totalRounds,
      };
    case 'FINAL_RESULTS':
      return {
        ...state,
        phase: 'FINAL_RESULTS',
        roundResults: action.roundResults,
        playerScores: action.players,
      };
    case 'PLAY_AGAIN':
      return {
        ...state,
        phase: 'LOBBY',
        players: action.players,
        currentRound: 0,
        roundResults: null,
        playerScores: [],
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  createRoom: (nickname: string) => void;
  joinRoom: (code: string, nickname: string) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  startGame: () => void;
  submitAnswers: (answers: { [catIndex: number]: string }) => void;
  submitVotes: (votes: { [catIndex: number]: { [playerId: string]: boolean } }) => void;
  nextRound: () => void;
  playAgain: () => void;
  leaveRoom: () => void;
  isHost: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const isHost = state.players.find((p) => p.id === state.playerId)?.isHost ?? false;

  // Connect socket on mount
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off();
    };
  }, []);

  // Register socket listeners
  useEffect(() => {
    socket.on('room:player-joined', (data) => {
      dispatch({ type: 'PLAYER_JOINED', player: data.player });
    });

    socket.on('room:player-left', (data) => {
      dispatch({ type: 'PLAYER_LEFT', players: data.players });
    });

    socket.on('room:settings-updated', (data) => {
      dispatch({ type: 'SETTINGS_UPDATED', settings: data.settings });
    });

    socket.on('game:round-start', (data) => {
      dispatch({
        type: 'ROUND_START',
        round: data.round,
        totalRounds: data.totalRounds,
        letter: data.letter,
        categories: data.categories,
      });
    });

    socket.on('game:playing', (data) => {
      dispatch({ type: 'PLAYING', timerEndsAt: data.timerEndsAt });
    });

    socket.on('game:player-submitted', (data) => {
      dispatch({ type: 'PLAYER_SUBMITTED', submittedCount: data.submittedCount });
    });

    socket.on('game:time-up', () => {
      dispatch({ type: 'TIME_UP' });
    });

    socket.on('game:validation-start', (data) => {
      dispatch({
        type: 'VALIDATION_START',
        answers: data.answers,
        categories: data.categories,
        letter: data.letter,
      });
    });

    socket.on('game:player-voted', (data) => {
      dispatch({ type: 'PLAYER_VOTED', votedCount: data.votedCount });
    });

    socket.on('game:round-results', (data) => {
      dispatch({
        type: 'ROUND_RESULTS',
        roundResults: data.roundResults,
        players: data.players,
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
      });
    });

    socket.on('game:final-results', (data) => {
      dispatch({
        type: 'FINAL_RESULTS',
        roundResults: data.roundResults,
        players: data.players,
      });
    });

    socket.on('game:play-again', (data) => {
      dispatch({ type: 'PLAY_AGAIN', players: data.players });
    });

    return () => {
      socket.off('room:player-joined');
      socket.off('room:player-left');
      socket.off('room:settings-updated');
      socket.off('game:round-start');
      socket.off('game:playing');
      socket.off('game:player-submitted');
      socket.off('game:time-up');
      socket.off('game:validation-start');
      socket.off('game:player-voted');
      socket.off('game:round-results');
      socket.off('game:final-results');
      socket.off('game:play-again');
    };
  }, []);

  const createRoom = useCallback((nickname: string) => {
    socket.emit('room:create', { nickname }, (res: any) => {
      if (res.ok) {
        dispatch({
          type: 'JOINED_ROOM',
          playerId: res.playerId,
          roomCode: res.room.code,
          players: res.room.players,
          settings: res.room.settings,
        });
      } else {
        dispatch({ type: 'SET_ERROR', error: res.error });
      }
    });
  }, []);

  const joinRoom = useCallback((code: string, nickname: string) => {
    socket.emit('room:join', { code: code.toUpperCase(), nickname }, (res: any) => {
      if (res.ok) {
        dispatch({
          type: 'JOINED_ROOM',
          playerId: res.playerId,
          roomCode: res.room.code,
          players: res.room.players,
          settings: res.room.settings,
        });
      } else {
        dispatch({ type: 'SET_ERROR', error: res.error || 'Could not join room' });
      }
    });
  }, []);

  const updateSettingsFn = useCallback((settings: Partial<RoomSettings>) => {
    socket.emit('room:update-settings', { settings }, () => {});
  }, []);

  const startGame = useCallback(() => {
    socket.emit('game:start', {}, (res: any) => {
      if (!res.ok) {
        dispatch({ type: 'SET_ERROR', error: res.error });
      }
    });
  }, []);

  const submitAnswers = useCallback((answers: { [catIndex: number]: string }) => {
    socket.emit('game:submit-answers', { answers }, () => {});
  }, []);

  const submitVotes = useCallback(
    (votes: { [catIndex: number]: { [playerId: string]: boolean } }) => {
      socket.emit('game:vote', { votes }, () => {});
    },
    []
  );

  const nextRound = useCallback(() => {
    socket.emit('game:next-round', {}, () => {});
  }, []);

  const playAgain = useCallback(() => {
    socket.emit('game:play-again', {}, () => {});
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        createRoom,
        joinRoom,
        updateSettings: updateSettingsFn,
        startGame,
        submitAnswers,
        submitVotes,
        nextRound,
        playAgain,
        leaveRoom,
        isHost,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
