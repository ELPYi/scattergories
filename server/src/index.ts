import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import { setupSocketIO } from './socket';
import { cleanupStaleRooms } from './roomManager';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

setupSocketIO(httpServer);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Cleanup stale rooms every 10 minutes
setInterval(cleanupStaleRooms, 10 * 60 * 1000);

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Scattergories server running on port ${PORT} (all interfaces)`);
});
