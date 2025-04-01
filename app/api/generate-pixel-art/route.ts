import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  console.log('========== 像素化图像API请求开始 ==========');

  let tempFilePath = '';

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: '缺少图像文件' }, { status: 400 });
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

    // 步骤1: 使用GPT-4o分析图像
    console.log('使用GPT-4o分析图像特征...');
    const visionAnalysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            '你是一个专业的图像分析专家。请详细描述图片中人物的特征，包括面部特征、发型、服装、配饰、纹身等每一个细节。请尽可能详细，描述需要适合用于DALL-E生成Minecraft风格的像素艺术。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请详细分析这张图片中人物的所有特征，准备用于生成Minecraft风格的像素艺术。' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${buffer.toString('base64')}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const imageAnalysis = visionAnalysis.choices[0].message.content;
    console.log('图像分析完成:', imageAnalysis);

    // 步骤2: 基于分析结果创建DALL-E 3提示词
    const prompt = `创建一张严格的Minecraft风格像素肖像，基于以下详细描述:

${imageAnalysis}

必须严格遵循以下Minecraft风格要求:
- 图像必须由明显的大方块像素构成，类似Minecraft游戏中的方块
- 面部和身体必须是由大的方形像素块组成，没有任何平滑过渡
- 使用Minecraft游戏的典型色彩和方块质感，最多使用16-24种颜色
- 不要使用任何平滑过渡、阴影渐变或抗锯齿效果
- 人物应该看起来就像是从Minecraft游戏中截取的角色，或者像Minecraft玩家皮肤
- 特别注意保持面部特征的相似性，即使是在Minecraft风格的限制下

最终效果必须是由明显可见的大方块像素组成的Minecraft风格角色，同时仍能识别出原图中的人物。`;

    // 步骤3: 使用DALL-E 3生成图像
    console.log('使用DALL-E 3生成Minecraft风格像素艺术...');
    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
    });

    console.log('Minecraft风格图像生成成功');
    return NextResponse.json({
      imageUrl: result.data[0].url,
      analysis: imageAnalysis, // 可选：返回分析结果供前端显示
    });
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
