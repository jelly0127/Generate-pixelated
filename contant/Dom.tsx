'use client';
import { Provider as ThemeProvider } from '../components/ui/provider';
import { Toaster } from '../components/ui/toaster';
import React, { useEffect, useRef } from 'react';
import useInitStore from '../store/useInitStore';
import { anotherFont, customFont } from '../app/font';
import { io, Socket } from 'socket.io-client';

const DomContent = ({ children }: { children: React.ReactNode }) => {
  const { updateLogin, updateInitLoading, userInfo, updatedUserInfo, isLogin, setServerTime } = useInitStore();

  const socketRef = useRef<Socket | null>(null);

  // 处理WebSocket连接
  useEffect(() => {
    if (socketRef.current) {
      console.log('Socket already exists, reconnecting...');
      if (isLogin && userInfo?.id) {
        socketRef.current.emit('subscribe_tactics', { userId: userInfo.id });
        socketRef.current.emit('subscribe_funds', { userId: userInfo.id });
        socketRef.current.emit('subscribe_user_asset', { userId: userInfo.id });
      }
      return;
    }

    const socket = io({
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // 订阅SOL价格
      socket.emit('subscribe_sol_price');

      // 订阅服务器时间
      socket.emit('subscribe_server_time');
    });

    // 其他事件处理
    socket.on('subscription_confirm', (data) => {
      console.log('Subscription confirmed:', data);
    });

    socket.on('connect_error', (error) => {
      updateInitLoading(false);
      console.error('Socket connection error:', error);
    });

    socket.on('error', (error) => {
      updateInitLoading(false);
      console.error('Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // 监听服务器时间更新
    socket.on('server_time', (data) => {
      if (data?.timestamp) {
        const serverTime = new Date(data.timestamp);
        setServerTime(serverTime);
      }
    });

    return () => {
      console.log('Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLogin]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetch('/api/server').catch((error) => console.error('Error setting up cron jobs:', error));
    }
  }, []);

  return (
    <div className={`${customFont.variable} ${anotherFont.variable}`}>
      <ThemeProvider>
        <Toaster />
        {children}
      </ThemeProvider>
    </div>
  );
};

const Dom = ({ children }: { children: React.ReactNode }) => {
  return <DomContent>{children}</DomContent>;
};

export default Dom;
