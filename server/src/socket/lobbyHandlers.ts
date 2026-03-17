import { Server, Socket } from 'socket.io';
import {
  createRoom,
  joinRoom,
  getRoom,
  removePlayer,
  getRoomBySocketId,
  updateSettings,
  markPlayerDisconnected,
  reconnectPlayer,
} from '../roomManager';
import { Room } from '../types';

function serializePlayers(room: Room) {
  return room.players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    isHost: p.isHost,
    connected: p.connected,
    totalScore: p.totalScore,
  }));
}

function buildAnswersForVoting(room: Room) {
  const answersForVoting: { [playerId: string]: { nickname: string; answers: { [catIndex: number]: string } } } = {};
  for (const player of room.players) {
    if (room.roundAnswers[player.id]) {
      answersForVoting[player.id] = {
        nickname: player.nickname,
        answers: room.roundAnswers[player.id],
      };
    }
  }
  return answersForVoting;
}

function serializeRoundResults(results: { [key: number]: any }) {
  const out: any = {};
  for (const [k, v] of Object.entries(results)) out[k] = v;
  return out;
}

function serializeRoom(room: Room) {
  return {
    code: room.code,
    players: serializePlayers(room),
    settings: room.settings,
    phase: room.phase,
    currentRound: room.currentRound,
    totalRounds: room.settings.numRounds,
    currentLetter: room.currentLetter,
    categories: room.currentCategories,
    timerEndsAt: room.timerEndsAt,
    // Phase-specific data for reconnecting players
    answersForVoting: room.phase === 'VALIDATION' ? buildAnswersForVoting(room) : null,
    roundResults: (room.phase === 'ROUND_RESULTS' || room.phase === 'FINAL_RESULTS')
      ? serializeRoundResults(room.roundResults)
      : null,
    playerScores: (room.phase === 'ROUND_RESULTS' || room.phase === 'FINAL_RESULTS')
      ? room.players.map((p) => ({ id: p.id, nickname: p.nickname, totalScore: p.totalScore }))
      : null,
  };
}

export function registerLobbyHandlers(io: Server, socket: Socket): void {
  socket.on('room:create', (data: { nickname: string }, callback) => {
    const room = createRoom(socket.id, data.nickname);
    socket.join(room.code);
    callback({ ok: true, room: serializeRoom(room), playerId: socket.id });
  });

  socket.on('room:join', (data: { code: string; nickname: string }, callback) => {
    const room = joinRoom(data.code, socket.id, data.nickname);
    if (!room) {
      callback({ ok: false, error: 'Room not found, full, or nickname taken' });
      return;
    }
    socket.join(room.code);
    callback({ ok: true, room: serializeRoom(room), playerId: socket.id });

    // Notify others
    socket.to(room.code).emit('room:player-joined', {
      player: {
        id: socket.id,
        nickname: data.nickname.trim().slice(0, 20),
        isHost: false,
        connected: true,
        totalScore: 0,
      },
    });
  });

  socket.on('room:rejoin', (data: { code: string; nickname: string }, callback) => {
    const room = getRoom(data.code);
    if (!room) {
      callback({ ok: false, error: 'Room not found' });
      return;
    }

    const player = reconnectPlayer(room, data.nickname, socket.id);
    if (!player) {
      callback({ ok: false, error: 'Player not found or already connected' });
      return;
    }

    socket.join(room.code);

    // Notify others that this player is back
    socket.to(room.code).emit('room:player-rejoined', {
      players: serializePlayers(room),
    });

    callback({ ok: true, room: serializeRoom(room), playerId: player.id });
  });

  socket.on('room:update-settings', (data: { settings: any }, callback) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player?.isHost) {
      callback?.({ ok: false, error: 'Not the host' });
      return;
    }
    updateSettings(room, data.settings);
    io.to(room.code).emit('room:settings-updated', { settings: room.settings });
    callback?.({ ok: true });
  });

  // Intentional leave — remove immediately
  socket.on('room:leave', () => {
    handlePermanentLeave(io, socket);
  });

  // Unexpected disconnect (tab switch, network drop) — grace period
  socket.on('disconnect', () => {
    handleTemporaryDisconnect(io, socket);
  });
}

function handleTemporaryDisconnect(io: Server, socket: Socket): void {
  const room = getRoomBySocketId(socket.id);
  if (!room) return;

  const player = room.players.find((p) => p.socketId === socket.id);
  if (!player) return;

  const playerId = player.id;
  const roomCode = room.code;

  markPlayerDisconnected(room, socket.id, (removedPlayerId) => {
    // Grace period expired — player permanently removed
    if (room.players.length > 0) {
      io.to(roomCode).emit('room:player-left', {
        playerId: removedPlayerId,
        players: serializePlayers(room),
      });
    }
  });

  socket.leave(roomCode);

  // Immediately notify others that the player is disconnected (but may return)
  io.to(roomCode).emit('room:player-disconnected', {
    playerId,
    players: serializePlayers(room),
  });
}

function handlePermanentLeave(io: Server, socket: Socket): void {
  const room = getRoomBySocketId(socket.id);
  if (!room) return;

  const player = room.players.find((p) => p.socketId === socket.id);
  const playerId = player?.id;

  removePlayer(room, socket.id);
  socket.leave(room.code);

  if (room.players.length > 0) {
    io.to(room.code).emit('room:player-left', {
      playerId,
      players: serializePlayers(room),
    });
  }
}
