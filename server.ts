import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocket } from 'ws';
import { setIO } from './lib/websocketManager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 声明全局变量
declare global {
  var io: SocketIOServer | undefined;
  var currentSolPrice: number | undefined;
}

async function setupServer() {
  await app.prepare();
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // 使用全局变量
  setIO(io);
  console.log('Socket.IO server initialized and assigned to global');

  // 添加连接日志
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'reason:', reason);
    });
  });

  // 设置服务器时间广播
  setupServerTimeEmitter(io);

  server.listen(port, () => {
    console.log(`> Server is running on http://${hostname}:${port}`);
    console.log('> WebSocket server is ready');
  });
}

// 添加服务器时间广播功能
function setupServerTimeEmitter(io: SocketIOServer) {
  // 立即发送一次当前时间
  broadcastServerTime(io);

  // 设置定时器，每秒检查一次
  setInterval(() => {
    const now = new Date();
    // 如果当前秒数为0，则发送时间戳
    if (now.getSeconds() === 0) {
      broadcastServerTime(io);
    }
  }, 1000); // 每秒检查一次
}

// 广播服务器时间戳
function broadcastServerTime(io: SocketIOServer) {
  const timestamp = new Date();
  io.emit('server_time', { timestamp });
}

setupServer().catch(console.error);
