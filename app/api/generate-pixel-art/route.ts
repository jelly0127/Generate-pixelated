import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/db';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 每日请求限制
const DAILY_REQUEST_LIMIT = 5;

// 增强版重试函数
const retryWithDelay = async <T>(
  fn: () => Promise<T>,
  retries: number = 5, // 增加重试次数到5次
  initialDelay: number = 2000, // 初始延迟2秒
  maxDelay: number = 10000 // 最大延迟10秒
): Promise<T> => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30秒超时
      });
      const resultPromise = fn();
      return (await Promise.race([resultPromise, timeoutPromise])) as T;
    } catch (error) {
      lastError = error;
      console.log(`重试第 ${i + 1} 次失败，等待重试...`);
      // 指数退避延迟
      const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

export async function POST(request: Request) {
  console.log('========== 像素化图像API请求开始 ==========');

  let tempFilePath = '';

  try {
    // 获取MAC地址
    const macAddress = request.headers.get('x-mac-address') || 'unknown';
    console.log('请求MAC地址:', macAddress);

    if (macAddress === 'unknown') {
      return NextResponse.json({ error: '无法识别设备，请提供MAC地址' }, { status: 400 });
    }

    // 检查MAC地址每日请求限制
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let macRecord = await prisma.macAddressLimit.findUnique({
      where: { macAddress },
    });

    // 如果记录不存在，创建新记录
    if (!macRecord) {
      macRecord = await prisma.macAddressLimit.create({
        data: { macAddress, dailyRequestCount: 0 },
      });
    }

    // 检查是否超过每日限制
    if (macRecord.dailyRequestCount >= DAILY_REQUEST_LIMIT) {
      return NextResponse.json(
        {
          error: `已达到每日请求限制(${DAILY_REQUEST_LIMIT}次)，请明天再试`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: '缺少图像文件' }, { status: 400 });
    }

    // 验证文件大小（4MB）
    if (imageFile.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过4MB' }, { status: 400 });
    }

    console.log('图像信息:', {
      name: imageFile.name,
      type: imageFile.type,
      size: `${(imageFile.size / 1024).toFixed(2)} KB`,
    });

    // 临时保存文件
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log('临时文件已创建:', tempFilePath);

    // 修改系统提示，使分析更详细
    const systemPrompt = `你是一个专业的图像分析专家。请详细分析图片中的人物特征，包括：
    1. 面部特征（眼睛形状和颜色、鼻子、嘴唇颜色和形状、肤色、脸型等）
    2. 发型（长度、颜色、质地、发型风格、刘海等）
    3. 服装（款式、颜色、材质、领口形状等）
    4. 配饰（项链、耳环、发饰、蝴蝶结等及其颜色和位置）
    5. 纹身或其他特殊标记（位置、图案、颜色）
    6. 整体姿态、表情和氛围

    请使用具体的色彩描述（如"浅棕色"而非"棕色"）和精确的形容词。这些描述将用于生成Minecraft风格的像素头像，必须极其详尽准确。
    描述应包含至少300个字符，细致描述每个重要特征。`;

    // 在分析图像部分使用更详细的系统提示
    const visionAnalysis = await retryWithDelay(
      async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请极其详细地分析这张图片中的所有细节，尤其关注面部特征、发饰和纹身。这将用于生成高度相似的Minecraft风格像素头像。',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${buffer.toString('base64')}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.5, // 降低温度确保更准确的描述
        });
      },
      3,
      2000
    );

    const imageAnalysis = visionAnalysis.choices[0].message.content || '';
    console.log('图像分析完成, 内容:', imageAnalysis);
    console.log('图像分析完成, 长度:', imageAnalysis.length);

    // 检查分析结果是否完整
    if (imageAnalysis.length < 50) {
      console.error('图像分析结果不完整，使用备用描述');

      // 使用备用描述生成图像
      const prompt = `创建一个单一的Minecraft风格正面头像，就像游戏中的用户头像一样:

${imageAnalysis}

严格要求:
- 只生成一个正面视角的头像，像Minecraft用户头像
- 图像必须是正方形，只显示头部和肩部,上半身
- 禁止多视角，禁止侧面图，禁止3D展示
- 禁止任何参考图、色板、箭头或标签
- 禁止分割画面，必须只有一个单一的头像图像
- 背景应该是简单纯色或透明

头像设计:
- 使用16x16或32x32像素的经典Minecraft头像风格
- 像素必须清晰可见，每个像素是方形的
- 头部应该占据图像的主要部分
- 确保保留蝴蝶发饰等原图中的重要特征
- 使用Minecraft风格的有限调色板

这个头像将直接用作用户的个人资料图片，请确保它是一个干净、单一的正面头像图像，没有任何额外元素。`;

      console.log('使用DALL-E 3生成Minecraft风格像素艺术...');
      const result = await retryWithDelay(
        async () =>
          await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            style: 'vivid',
          }),
        5 // 5次重试
      );
      if (result.data[0].url) {
        // 更新请求计数
        await prisma.macAddressLimit.update({
          where: { macAddress },
          data: {
            dailyRequestCount: macRecord.dailyRequestCount + 1,
            lastRequestDate: new Date(),
          },
        });
        console.log('Minecraft风格图像生成成功');
        return NextResponse.json({
          imageUrl: result.data[0].url,
          remainingRequests: DAILY_REQUEST_LIMIT - (macRecord.dailyRequestCount + 1),
        });
      } else {
        console.error('Minecraft风格图像生成失败');
        return NextResponse.json({ error: '图像处理失败' }, { status: 500 });
      }
    } else {
      // 强化版提示词，专注于单一头像生成
      const prompt = `创建一张干净的方形Minecraft风格像素头像，不含任何额外元素:

${imageAnalysis}

【重要】这是用于头像的最终成品图，必须遵循以下要求:
1. 整个图像中必须只有一个主体人物头像，不能有任何其他视图或参考元素
2. 绝对禁止生成任何色板、参考图、设计元素、UI界面或分割线
3. 绝对禁止在画面任何部分包含箭头、标签、文字说明或辅助图形
4. 绝对禁止将图像分割为多个部分或多个视角
5. 背景必须是单一纯色，没有任何图案或渐变
6. 必须是完整的作品，直接可用作头像，无需任何裁剪

Minecraft风格要求:
1. 使用清晰的像素方块表现，像Minecraft皮肤那样
2. 面部细节要精确（眼睛、嘴唇与原图高度相似）
3. 如蝴蝶发饰必须准确表现，包括颜色和位置
4. 头发颜色和风格必须与原图匹配
5. 如项链和纹身细节要保留，但用像素风格表现

最终成品必须是单一的、完整的、独立的Minecraft风格人物头像，没有任何其他元素，就像是已经裁剪好的头像图片。这张图片将直接用于用户界面，不需要任何后期编辑。`;

      console.log('使用DALL-E 3生成Minecraft风格像素艺术...');
      const result = await retryWithDelay(
        async () =>
          await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            style: 'vivid',
          }),
        5
      );

      if (result.data[0].url) {
        // 更新请求计数
        await prisma.macAddressLimit.update({
          where: { macAddress },
          data: {
            dailyRequestCount: macRecord.dailyRequestCount + 1,
            lastRequestDate: new Date(),
          },
        });
      }

      console.log('Minecraft风格图像生成成功');
      return NextResponse.json({
        imageUrl: result.data[0].url,
        analysis: imageAnalysis,
        remainingRequests: DAILY_REQUEST_LIMIT - (macRecord.dailyRequestCount + 1),
      });
    }
  } catch (error) {
    console.error('处理失败:', error);
    return NextResponse.json({ error: '图像处理失败' }, { status: 500 });
  } finally {
    // 清理临时文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    console.log('========== 像素化图像API请求结束 ==========');
  }
}
