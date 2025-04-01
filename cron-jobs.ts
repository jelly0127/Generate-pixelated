import cron from 'node-cron';
import { prisma } from './lib/db';

export const scheduleCronJobs = async () => {
  console.log('开始初始化定时任务...');
  // 北京时间 00:00:00 (UTC+8)
  // 转换为服务器时区的cron表达式
  // 假设服务器是UTC时间，那么应该是 "0 16 * * *" (UTC 16:00 = UTC+8 00:00)
  // 如果服务器已经是UTC+8，那么就是 "0 0 * * *"

  cron.schedule('0 16 * * *', async () => {
    try {
      console.log('执行每日MAC地址请求计数重置...');

      // 重置所有MAC地址的每日请求计数
      await prisma.macAddressLimit.updateMany({
        data: {
          dailyRequestCount: 0,
          lastRequestDate: new Date(),
        },
      });

      console.log('MAC地址请求计数重置完成');
    } catch (error) {
      console.error('MAC地址请求计数重置失败:', error);
    }
  });
};
