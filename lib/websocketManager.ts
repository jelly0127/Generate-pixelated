import { Server as SocketIOServer } from 'socket.io';

// 声明全局变量
declare global {
  var io: SocketIOServer | undefined;
}

export function getIO(): SocketIOServer | null {
  return global.io || null;
}

export function setIO(io: SocketIOServer): void {
  global.io = io;
  console.log('Global Socket.IO instance set successfully');
}
