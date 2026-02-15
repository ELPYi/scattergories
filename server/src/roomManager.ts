import { Room, Player, RoomSettings, DEFAULT_SETTINGS } from './types';
import { generateRoomCode, sanitizeNickname } from './utils';

const rooms = new Map<string, Room>();

export function createRoom(socketId: string, nickname: string): Room {
  let code: string;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const playerId = socketId;
  const player: Player = {
    id: playerId,
    socketId,
    nickname: sanitizeNickname(nickname),
    isHost: true,
    connected: true,
    totalScore: 0,
  };

  const room: Room = {
    code,
    players: [player],
    settings: { ...DEFAULT_SETTINGS },
    phase: 'LOBBY',
    currentRound: 0,
    currentLetter: '',
    currentCategories: [],
    roundAnswers: {},
    submittedPlayers: new Set(),
    voteState: {},
    votedPlayers: new Set(),
    roundResults: {},
    timerEndsAt: null,
    timerId: null,
    usedLetters: [],
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, socketId: string, nickname: string): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (room.phase !== 'LOBBY') return null;

  // Check if nickname already taken
  const nameTaken = room.players.some(
    (p) => p.nickname.toLowerCase() === sanitizeNickname(nickname).toLowerCase() && p.connected
  );
  if (nameTaken) return null;

  const player: Player = {
    id: socketId,
    socketId,
    nickname: sanitizeNickname(nickname),
    isHost: false,
    connected: true,
    totalScore: 0,
  };

  room.players.push(player);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function getRoomBySocketId(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return undefined;
}

export function removePlayer(room: Room, socketId: string): boolean {
  const idx = room.players.findIndex((p) => p.socketId === socketId);
  if (idx === -1) return false;

  const wasHost = room.players[idx].isHost;
  room.players.splice(idx, 1);

  // If all players gone, delete room
  if (room.players.length === 0) {
    if (room.timerId) clearTimeout(room.timerId);
    rooms.delete(room.code);
    return true;
  }

  // Promote next player to host if host left
  if (wasHost) {
    const nextHost = room.players.find((p) => p.connected);
    if (nextHost) nextHost.isHost = true;
  }

  return true;
}

export function updateSettings(room: Room, settings: Partial<RoomSettings>): void {
  if (settings.timerSeconds !== undefined) {
    room.settings.timerSeconds = Math.max(30, Math.min(300, settings.timerSeconds));
  }
  if (settings.numRounds !== undefined) {
    room.settings.numRounds = Math.max(1, Math.min(10, settings.numRounds));
  }
  if (settings.numCategories !== undefined) {
    room.settings.numCategories = Math.max(3, Math.min(16, settings.numCategories));
  }
  if (settings.validationMode !== undefined) {
    room.settings.validationMode = settings.validationMode;
  }
}

export function deleteRoom(code: string): void {
  const room = rooms.get(code);
  if (room?.timerId) clearTimeout(room.timerId);
  rooms.delete(code);
}

// Cleanup stale rooms older than 2 hours
export function cleanupStaleRooms(): void {
  // Since we don't track creation time, we'll clean rooms with 0 connected players
  for (const [code, room] of rooms) {
    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected) {
      if (room.timerId) clearTimeout(room.timerId);
      rooms.delete(code);
    }
  }
}
