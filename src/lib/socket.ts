import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: SocketIOServer | null = null;

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const initIO = (server: NetServer) => {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-anime', (animeId: string) => {
        socket.join(`anime:${animeId}`);
        socket.to(`anime:${animeId}`).emit('user-joined', { socketId: socket.id });
      });

      socket.on('join-episode', (episodeId: string) => {
        socket.join(`episode:${episodeId}`);
      });

      socket.on('new-comment', (data) => {
        const { animeId, episodeId } = data;
        if (animeId) {
          socket.to(`anime:${animeId}`).emit('comment-added', data);
        }
        if (episodeId) {
          socket.to(`episode:${episodeId}`).emit('comment-added', data);
        }
      });

      socket.on('typing', (data) => {
        socket.to(`episode:${data.episodeId}`).emit('user-typing', {
          userId: data.userId,
          username: data.username,
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
  return io;
};
