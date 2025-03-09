import { scheduleCronJobs } from '../../../cron-jobs';
import { NextRequest, NextResponse } from 'next/server';

let cronJobsScheduled = false;

export async function GET(req: NextRequest) {
  try {
    console.log('Received request:', req.method);

    // 检查是否为 GET 方法
    if (req.method !== 'GET') {
      return NextResponse.json(
        { error: 'Method Not Allowed' },
        { status: 405 } // 使用 HTTP 405 状态码
      );
    }

    // 检查是否已设置 Cron 作业
    if (!cronJobsScheduled) {
      console.log('Scheduling cron jobs...');
      scheduleCronJobs();
      cronJobsScheduled = true;
      console.log('Cron jobs scheduled successfully.');
    } else {
      console.log('Cron jobs were already scheduled.');
    }

    return NextResponse.json({ message: 'Cron jobs are set up successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error scheduling cron jobs:', error);

    // 返回错误信息
    return NextResponse.json(
      {
        error: 'Failed to schedule cron jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 } // 使用 HTTP 500 状态码
    );
  }
}
