import { Server, Socket } from 'socket.io';
import { getRoomBySocketId } from '../roomManager';
import { handleVote } from '../gameStateMachine';

export function registerVoteHandlers(io: Server, socket: Socket): void {
  socket.on('game:vote', (data: { votes: { [catIndex: number]: { [playerId: string]: boolean } } }, callback) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }
    if (room.phase !== 'VALIDATION') {
      callback?.({ ok: false, error: 'Not in validation phase' });
      return;
    }

    handleVote(io, room, socket.id, data.votes);
    callback?.({ ok: true });
  });
}
