import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './socket/handlers.js';

export function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager();
  registerSocketHandlers(io, roomManager);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return { app, server, io, roomManager };
}

// Start standalone server if directly executed
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 4000;
  const { server } = createServer();
  server.listen(port, () => {
    console.log(`[Colonist Gambit] Server running on http://localhost:${port}`);
  });
}
