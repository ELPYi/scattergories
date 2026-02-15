import { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoom, removePlayer, getRoomBySocketId, updateSettings } from '../roomManager';

function serializeRoom(room: any) {
  return {
    code: room.code,
    players: room.players.map((p: any) => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      connected: p.connected,
      totalScore: p.totalScore,
    })),
    settings: room.settings,
    phase: room.phase,
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

  socket.on('room:leave', () => {
    handleDisconnect(io, socket);
  });

  socket.on('disconnect', () => {
    handleDisconnect(io, socket);
  });
}

function handleDisconnect(io: Server, socket: Socket): void {
  const room = getRoomBySocketId(socket.id);
  if (!room) return;

  removePlayer(room, socket.id);
  socket.leave(room.code);

  if (room.players.length > 0) {
    io.to(room.code).emit('room:player-left', {
      playerId: socket.id,
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        connected: p.connected,
        totalScore: p.totalScore,
      })),
    });
  }
}
