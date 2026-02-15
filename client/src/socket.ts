import { io, Socket } from 'socket.io-client';

// Connect to the server on port 3001 using the same hostname the browser is on
const URL = `http://${window.location.hostname}:3001`;

export const socket: Socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
