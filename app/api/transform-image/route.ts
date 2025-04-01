import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

  if (!record || now - record.timestamp > hourInMs) {
    ipRequestMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count < limit) {
    record.count += 1;
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  console.log('========== API请求开始 ==========');
  console.log('时间:', new Date().toISOString());

  // 临时文件路径
  let tempFilePath = '';

  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    // if (!checkIPLimit(ip)) {
    //   return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
    // }

    console.log('正在解析表单数据...');
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error('错误: 未接收到图像文件');
      return NextResponse.json({ error: '缺少图像文件' }, { status: 400 });
    }

    // 移除只支持PNG的限制
    // if (!imageFile.name.endsWith('.png')) {
    //   return NextResponse.json({ error: '仅支持 PNG 格式的图片' }, { status: 400 });
    // }

    console.log('图像文件信息:', {
      name: imageFile.name,
      type: imageFile.type,
      size: `${(imageFile.size / 1024).toFixed(2)} KB`,
    });

    // 将文件写入临时路径
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 确保图像是PNG格式
    const pngBuffer = await sharp(buffer).png().toBuffer();

    // 将处理后的图像写入临时文件
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, pngBuffer);

    console.log('临时文件已创建:', tempFilePath);

    // 直接使用文件流而不是Readable.from
    console.log('调用 OpenAI createVariation 接口...');
    const variationResult = await openai.images.createVariation({
      image: fs.createReadStream(tempFilePath) as any,
      n: 1,
      size: '1024x1024',
    });

    const variationUrl = variationResult.data[0].url;
    console.log('图像变体生成成功:', variationUrl);

    // 删除临时文件
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return NextResponse.json({ imageUrl: variationUrl });
  } catch (error: any) {
    console.error('变体API出错:', error);

    // 如果变体API失败，尝试使用DALL-E 3生成API作为后备
    try {
      console.log('尝试使用generate API...');
      const generateResult = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `创建一个Minecraft风格的像素艺术肖像，显示一位年轻女性，有以下特征:
        - 长棕色头发
        - 皮肤白皙
        - 戴着蝴蝶发饰/头饰
        - 身上有纹身
        - 穿着白色上衣
        - 胸前有蝴蝶装饰元素
        使用明显的方块结构，每个像素清晰可见。限制颜色数量不超过32种。
        结果必须是女性肖像，不生成风景或建筑物。`,
        n: 1,
        size: '1024x1024',
      });

      return NextResponse.json({ imageUrl: generateResult.data[0].url });
    } catch (generateError) {
      console.error('所有方法都失败:', generateError);
      return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
    } finally {
      // 确保临时文件被删除
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } finally {
    console.log('========== API请求结束 ==========');
  }
}
