import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://127.0.0.1:3000';

class SocketService {
  public socket: Socket | null = null;

  connect(userId: number) {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.socket?.emit('register_user', userId);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onNewMessage(callback: (data: any) => void) {
    if (this.socket) {
      // Remove any existing listeners to prevent duplicates
      this.socket.off('new_message');
      this.socket.on('new_message', callback);
    }
  }
}

const socketService = new SocketService();
export default socketService;
