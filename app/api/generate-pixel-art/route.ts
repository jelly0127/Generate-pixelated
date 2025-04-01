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

// 重试函数
const retryWithDelay = async <T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay * 2);
  }
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

    // 步骤1: 使用GPT-4O分析图像
    console.log('使用GPT-4O分析图像特征...');
    const visionAnalysis = await retryWithDelay(
      async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的图像分析专家。请详细分析图片中的人物特征，包括：
1. 面部特征（眼睛、嘴唇、肤色等）
2. 发型（长度、颜色、风格）
3. 服装（类型、颜色、风格）
4. 配饰（项链、发饰等）
5. 纹身或其他特殊标记
6. 整体姿态和表情

请确保描述详尽且准确，这些信息将用于生成Minecraft风格的像素艺术。
描述应该至少包含200个字符。`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请仔细分析这张图片中的所有细节，用于生成Minecraft风格的像素艺术。',
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
          temperature: 0.7,
        });
      },
      3,
      2000
    );

    const imageAnalysis = visionAnalysis.choices[0].message.content || '';
    console.log('图像分析完成, 内容:', imageAnalysis);
    console.log('图像分析完成, 长度:', imageAnalysis.length);

    // 检查分析结果是否完整
    if (imageAnalysis.length < 200) {
      console.error('图像分析结果不完整，使用备用描述');

      // 使用备用描述生成图像
      const prompt = `创建一张严格的Minecraft风格像素肖像，基于以下详细描述:

必须严格遵循以下Minecraft风格要求:
- 图像必须由明显的大方块像素构成，类似Minecraft游戏中的方块
- 面部和身体必须是由大的方形像素块组成，没有任何平滑过渡
- 使用Minecraft游戏的典型色彩和方块质感，最多使用16-24种颜色
- 不要使用任何平滑过渡、阴影渐变或抗锯齿效果
- 人物应该看起来就像是从Minecraft游戏中截取的角色，或者像Minecraft玩家皮肤
- 特别注意保持面部特征的相似性，即使是在Minecraft风格的限制下

最终效果必须是由明显可见的大方块像素组成的Minecraft风格角色，同时仍能识别出原图中的人物。
结果必须是人物肖像，而不是风景或建筑物。`;

      console.log('使用DALL-E 3生成Minecraft风格像素艺术...');
      const result = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
      });

      console.log('Minecraft风格图像生成成功');
      return NextResponse.json({
        imageUrl: result.data[0].url,
        remainingRequests: DAILY_REQUEST_LIMIT - (macRecord.dailyRequestCount + 1),
      });
    } else {
      // 使用成功的分析结果
      const prompt = `创建一张严格的Minecraft风格像素肖像，基于以下详细描述:

${imageAnalysis}

必须严格遵循以下Minecraft风格要求:
- 图像必须由明显的大方块像素构成，类似Minecraft游戏中的方块
- 面部和身体必须是由大的方形像素块组成，没有任何平滑过渡
- 使用Minecraft游戏的典型色彩和方块质感，最多使用16-24种颜色
- 不要使用任何平滑过渡、阴影渐变或抗锯齿效果
- 人物应该看起来就像是从Minecraft游戏中截取的角色，或者像Minecraft玩家皮肤
- 特别注意保持面部特征的相似性，即使是在Minecraft风格的限制下

最终效果必须是由明显可见的大方块像素组成的Minecraft风格角色，同时仍能识别出原图中的人物。
结果必须是人物肖像，而不是风景或建筑物。`;

      console.log('使用DALL-E 3生成Minecraft风格像素艺术...');
      const result = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
      });

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
