import React, { useState, useEffect, useCallback } from 'react';

interface CountdownProps {
  // 可以接收截止时间戳(毫秒)或Date对象
  endTime?: number | Date;
  // 或者接收倒计时持续时间(秒)
  duration?: number;
  // 倒计时结束时的回调函数
  onComplete?: () => void;
  // 自定义样式类
  className?: string;
  // 显示格式 ('hh:mm:ss' | 'mm:ss' | 'full')
  format?: 'hh:mm:ss' | 'mm:ss' | 'full';
}

// 计算两个时间之间的差值(毫秒)
const getTimeRemaining = (endTime: number): number => {
  const now = new Date().getTime();
  const difference = endTime - now;
  return difference > 0 ? difference : 0;
};

// 格式化时间显示
const formatTime = (milliseconds: number, format: 'hh:mm:ss' | 'mm:ss' | 'full'): string => {
  // 转换毫秒为各个时间单位
  const seconds = Math.floor((milliseconds / 1000) % 60);
  const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
  const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));

  // 用于填充零
  const pad = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

  if (format === 'full' && days > 0) {
    return `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (format === 'hh:mm:ss' || (format === 'full' && hours > 0)) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    return `${pad(minutes)}:${pad(seconds)}`;
  }
};

const Countdown: React.FC<CountdownProps> = ({
  endTime,
  duration,
  onComplete,
  className = '',
  format = 'hh:mm:ss',
}) => {
  // 计算截止时间
  const calculateEndTime = useCallback((): number => {
    if (endTime) {
      // 如果提供了截止时间，直接使用
      return endTime instanceof Date ? endTime.getTime() : endTime;
    } else if (duration) {
      // 如果提供了持续时间，计算截止时间
      return new Date().getTime() + duration * 1000;
    } else {
      // 默认10分钟
      return new Date().getTime() + 10 * 60 * 1000;
    }
  }, [endTime, duration]);

  // 设置倒计时状态
  const [timeRemaining, setTimeRemaining] = useState<number>(getTimeRemaining(calculateEndTime()));
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // 处理倒计时更新和完成
  useEffect(() => {
    const deadline = calculateEndTime();

    // 立即计算一次剩余时间
    setTimeRemaining(getTimeRemaining(deadline));

    // 创建倒计时定时器
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(deadline);
      setTimeRemaining(remaining);

      // 检查倒计时是否完成
      if (remaining <= 0 && !isComplete) {
        clearInterval(timer);
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    // 清理函数
    return () => clearInterval(timer);
  }, [calculateEndTime, onComplete, isComplete]);

  // 渲染倒计时显示
  return (
    <div className={`countdown ${className}`}>
      {isComplete ? (
        <span className="countdown-complete">00:00:00</span>
      ) : (
        <span className="countdown-time">{formatTime(timeRemaining, format)}</span>
      )}
    </div>
  );
};

export default Countdown;
