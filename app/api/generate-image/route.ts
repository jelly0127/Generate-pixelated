import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 从环境变量获取API密钥
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', style = 'pixelart' } = body;

    if (!prompt) {
      return NextResponse.json({ error: '缺少提示文本' }, { status: 400 });
    }

    // 改进提示词以获得更好的我的世界像素风格
    const enhancedPrompt = `以8位像素风格创建一个我的世界风格的动漫角色头像。${prompt}。
    使用方块像素艺术风格，保持明显的像素网格，色彩鲜明且有限的调色板。
    确保风格类似于Minecraft游戏的方块美学，细节要清晰可辨但符合像素艺术的约束。
    适合作为游戏头像使用，正方形比例。`;

    const response = await openai.images.generate({
      model: 'gpt-4o', // 确保使用GPT-4o模型
      prompt: enhancedPrompt,
      n: 1,
      size: size as any,
      style: style as any,
      quality: 'hd',
      response_format: 'url',
    });

    // 返回生成的图像URL
    return NextResponse.json({ imageUrl: response.data[0].url });
  } catch (error: any) {
    console.error('图像生成错误:', error);
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
