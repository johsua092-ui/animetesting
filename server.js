const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  // Store connected users per episode
  const episodeRooms = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join episode room
    socket.on('join-episode', ({ animeId, episodeId }) => {
      const roomId = `${animeId}-${episodeId}`;
      socket.join(roomId);
      
      // Track users in room
      if (!episodeRooms.has(roomId)) {
        episodeRooms.set(roomId, new Set());
      }
      episodeRooms.get(roomId).add(socket.id);
      
      // Broadcast user count
      const count = episodeRooms.get(roomId).size;
      io.to(roomId).emit('user-count', count);
      
      console.log(`User ${socket.id} joined room ${roomId}. Count: ${count}`);
    });

    // Handle new comment
    socket.on('send-comment', (data) => {
      const roomId = `${data.animeId}-${data.episodeId}`;
      // Broadcast to all users in room except sender
      socket.to(roomId).emit('new-comment', data.comment);
    });

    // Handle typing indicator
    socket.on('typing', ({ animeId, episodeId, username }) => {
      const roomId = `${animeId}-${episodeId}`;
      socket.to(roomId).emit('user-typing', { username });
    });

    // Leave room
    socket.on('leave-episode', ({ animeId, episodeId }) => {
      const roomId = `${animeId}-${episodeId}`;
      socket.leave(roomId);
      
      if (episodeRooms.has(roomId)) {
        episodeRooms.get(roomId).delete(socket.id);
        const count = episodeRooms.get(roomId).size;
        io.to(roomId).emit('user-count', count);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove from all rooms
      episodeRooms.forEach((users, roomId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          io.to(roomId).emit('user-count', users.size);
        }
      });
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
