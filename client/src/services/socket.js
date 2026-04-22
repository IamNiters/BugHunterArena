import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

export function getSocket() {
  if (!socket) {
    const auth = JSON.parse(localStorage.getItem('bha-auth') || '{}');
    const token = auth?.state?.token;

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('🔌 Socket connecté'));
    socket.on('disconnect', () => console.log('🔌 Socket déconnecté'));
    socket.on('connect_error', (err) => console.error('Socket erreur:', err.message));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
