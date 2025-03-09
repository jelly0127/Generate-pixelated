import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const timestamp = Date.now(); // 获取当前时间戳（毫秒）
    const datetime = new Date(timestamp).toISOString(); // 同时返回 ISO 格式的日期时间字符串
    return NextResponse.json({
      success: true,
      timestamp,
      datetime,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get server timestamp',
      },
      { status: 500 }
    );
  }
}
