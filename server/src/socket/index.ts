import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { registerLobbyHandlers } from './lobbyHandlers';
import { registerGameHandlers } from './gameHandlers';
import { registerVoteHandlers } from './voteHandlers';

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerVoteHandlers(io, socket);
  });

  return io;
}
