import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:3003', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('[Socket.IO] Connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('[Socket.IO] Disconnected:', reason));
    socket.on('connect_error', (err) => console.warn('[Socket.IO] Error:', err.message));
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
