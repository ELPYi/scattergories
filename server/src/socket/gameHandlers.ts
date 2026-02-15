import { Server, Socket } from 'socket.io';
import { getRoomBySocketId } from '../roomManager';
import { startRound, handlePlayerSubmit, resetForPlayAgain } from '../gameStateMachine';

export function registerGameHandlers(io: Server, socket: Socket): void {
  socket.on('game:start', (_, callback) => {
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
    if (room.players.filter((p) => p.connected).length < 2) {
      callback?.({ ok: false, error: 'Need at least 2 players' });
      return;
    }
    if (room.phase !== 'LOBBY') {
      callback?.({ ok: false, error: 'Game already in progress' });
      return;
    }

    callback?.({ ok: true });
    startRound(io, room);
  });

  socket.on('game:submit-answers', (data: { answers: { [catIndex: number]: string } }, callback) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }
    handlePlayerSubmit(io, room, socket.id, data.answers);
    callback?.({ ok: true });
  });

  socket.on('game:next-round', (_, callback) => {
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
    if (room.phase !== 'ROUND_RESULTS') {
      callback?.({ ok: false, error: 'Not in round results phase' });
      return;
    }

    callback?.({ ok: true });
    startRound(io, room);
  });

  socket.on('game:play-again', (_, callback) => {
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
    if (room.phase !== 'FINAL_RESULTS') {
      callback?.({ ok: false, error: 'Not in final results phase' });
      return;
    }

    resetForPlayAgain(room);
    callback?.({ ok: true });

    io.to(room.code).emit('game:play-again', {
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        connected: p.connected,
        totalScore: 0,
      })),
    });
  });
}
