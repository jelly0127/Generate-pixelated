import cron from 'node-cron';
import { prisma } from './lib/db';

export const scheduleCronJobs = async () => {
  // beijing time 00:00:00

  cron.schedule('0 0 0 * * *', async () => {
    try {
    } catch (error) {
      console.error('Failed to update exchange rate:', error);
    }
  });
};
