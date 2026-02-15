import { io, Socket } from 'socket.io-client';

// In production, connect to same origin (server serves both API and static files)
// In dev, Vite proxy forwards to the backend
export const socket: Socket = io(undefined, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
