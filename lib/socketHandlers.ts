import { Socket } from 'socket.io';

// 处理服务器时间订阅
export function handleSubscribeServerTime(socket: Socket) {
  const timestamp = new Date();
  socket.emit('server_time', { timestamp });
}
