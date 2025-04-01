import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// IP请求记录接口
interface IPRecord {
  count: number;
  timestamp: number;
}

// 存储IP请求记录
const ipRequestMap = new Map<string, IPRecord>();

// 检查IP限制函数
function checkIPLimit(ip: string): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000; // 1小时的毫秒数
  const limit = 2; // 每小时最大请求次数

  const record = ipRequestMap.get(ip);

  // 如果没有记录或记录已过期，创建新记录
  if (!record || now - record.timestamp > hourInMs) {
    ipRequestMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  // 如果记录存在但未达到限制，增加计数
  if (record.count < limit) {
    record.count += 1;
    return true;
  }

  // 已达到限制
  return false;
}

export async function POST(request: Request) {
  try {
    // // 获取客户端IP
    // const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';

    // // 检查IP限制
    // if (!checkIPLimit(ip)) {
    //   return NextResponse.json({ error: '您已达到每小时2次的请求限制，请稍后再试' }, { status: 429 });
    // }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const style = (formData.get('style') as string) || 'minecraft';

    if (!imageFile) {
      return NextResponse.json({ error: '缺少图像文件' }, { status: 400 });
    }

    // 直接使用File对象，它已经是Uploadable类型
    const response = await openai.images.edit({
      image: imageFile,
      prompt:
        '将这个头像转换为我的世界风格的像素艺术。保持方块像素风格，使用鲜明的色彩和有限的调色板。确保风格类似于Minecraft游戏的方块美学。',
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });

    // 返回生成的图像URL
    return NextResponse.json({ imageUrl: response.data[0].url });
  } catch (error: any) {
    console.error('图像转换错误:', error);
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
