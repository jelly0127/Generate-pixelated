import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    // 获取图片数据
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    // 返回图片数据
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="pixel_art.png"',
      },
    });
  } catch (error) {
    console.error('Download failed:', error);
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
  }
}
