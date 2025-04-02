import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/db';

// init OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Daily request limit
const DAILY_REQUEST_LIMIT = 5;
const GLOBAL_RATE_LIMIT_PER_MINUTE = 15;

// Enhanced retry function
const retryWithDelay = async <T>(
  fn: () => Promise<T>,
  retries: number = 5, // Increase retries to 5 times
  initialDelay: number = 2000, // Initial delay 2 seconds
  maxDelay: number = 10000 // Maximum delay 10 seconds
): Promise<T> => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds timeout
      });
      const resultPromise = fn();
      return (await Promise.race([resultPromise, timeoutPromise])) as T;
    } catch (error) {
      lastError = error;
      console.log(`Retry ${i + 1} failed, waiting...`);
      // Exponential backoff delay
      const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

export async function POST(request: Request) {
  console.log('========== Pixel Art API Request Start ==========');

  let tempFilePath = '';

  try {
    // Get MAC address
    const macAddress = request.headers.get('x-mac-address') || 'unknown';
    console.log('Request MAC address:', macAddress);

    if (macAddress === 'unknown') {
      return NextResponse.json({ error: 'Unable to identify device, please provide MAC address' }, { status: 400 });
    }

    // Check MAC address daily request limit and user-level rate limit
    let macRecord = await prisma.macAddressLimit.findUnique({
      where: { macAddress },
    });

    // Create new record if it doesn't exist
    if (!macRecord) {
      macRecord = await prisma.macAddressLimit.create({
        data: { macAddress, dailyRequestCount: 0 },
      });
    }

    // Check if daily limit exceeded
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (macRecord.dailyRequestCount >= DAILY_REQUEST_LIMIT) {
      return NextResponse.json(
        {
          error: `Daily request limit reached (${DAILY_REQUEST_LIMIT} requests), please try again tomorrow`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    // Validate file size (4MB)
    if (imageFile.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image size cannot exceed 4MB' }, { status: 400 });
    }

    console.log('Image information:', {
      name: imageFile.name,
      type: imageFile.type,
      size: `${(imageFile.size / 1024).toFixed(2)} KB`,
    });

    // Save file temporarily
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, buffer);

    console.log('Temporary file created:', tempFilePath);

    // Modify image analysis section
    const systemPrompt = `You are a professional image analysis expert. Please objectively describe the elements in the image, including:
    1. Colors (main colors, tone, brightness)
    2. Layout and composition (subject position, background)
    3. Style characteristics (photo, anime, painting, etc.)
    4. Objects and environment (if recognizable)

    Please maintain objective descriptions and avoid subjective judgments. If you see people, only describe basic outlines and color characteristics, such as "there is a human figure, with main color tones of...".
    This description will be used to generate Minecraft-style pixel art.`;

    // Use more objective system prompt in image analysis
    const visionAnalysis = await retryWithDelay(
      async () => {
        // === 在这里检查全局速率限制 ===
        const now = new Date();
        let globalLimit = await prisma.apiRateLimit.findUnique({
          where: { id: 'global' },
        });

        // Create a record if it doesn't exist
        if (!globalLimit) {
          globalLimit = await prisma.apiRateLimit.create({
            data: { id: 'global', requestCount: 0, windowStartTime: now },
          });
        }

        // Check if time window has expired (if it's a new minute)
        const windowDuration = 60 * 1000; // 1 minute
        const windowExpired = now.getTime() - globalLimit.windowStartTime.getTime() > windowDuration;

        // Reset or increment counter
        if (windowExpired) {
          await prisma.apiRateLimit.update({
            where: { id: 'global' },
            data: { requestCount: 1, windowStartTime: now },
          });
        } else if (globalLimit.requestCount >= GLOBAL_RATE_LIMIT_PER_MINUTE) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          // Increment counter
          await prisma.apiRateLimit.update({
            where: { id: 'global' },
            data: { requestCount: globalLimit.requestCount + 1 },
          });
        }

        // 调用 GPT API
        return await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please objectively describe the visual elements of this image...',
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
          max_tokens: 1000,
          temperature: 0.3,
        });
      },
      3,
      2000
    );

    const imageAnalysis = visionAnalysis.choices[0].message.content || '';
    console.log('Image analysis completed, content:', imageAnalysis);
    console.log('Image analysis completed, length:', imageAnalysis.length);

    // Backup description function
    const getBackupDescription = () => {
      const backupDescriptions = [
        'Young character figure, main color tones are orange and blue, simple background. Minecraft style should maintain distinct pixel block characteristics, preserving basic outline and main color tones.',
        'Pixel style character, rich in colors, mainly composed of blocks. Maintain common 8x8 or 16x16 pixel style from Minecraft games, with vibrant colors.',
        "Game style character, using bright main color tones, distinct pixels. Should present Minecraft's signature block composition with clear outlines.",
      ];

      // Randomly select a description
      return backupDescriptions[Math.floor(Math.random() * backupDescriptions.length)];
    };

    // Check if analysis result is complete
    if (imageAnalysis.length < 50 || imageAnalysis.includes('sorry') || imageAnalysis.includes('unable')) {
      console.log('Image analysis result incomplete or rejected, using backup description');

      // Use random backup description
      const backupDescription = getBackupDescription();

      // Generate image using backup description
      const prompt = `Create a single Minecraft-style front-facing avatar, as a game user avatar:

${backupDescription}

Strict requirements:
- Generate only one front-view avatar, like a Minecraft user avatar
- Image must be square, showing only head and shoulders, upper body
- No multiple angles, no side views, no 3D display
- No reference images, color palettes, arrows, or labels
- No split screens, must be a single avatar image only
- Background should be simple solid color or transparent

Avatar design:
- Use classic Minecraft avatar style of 16x16 or 32x32 pixels
- Pixels must be clearly visible, each pixel is square
- Head should occupy the main portion of the image
- Use limited Minecraft-style color palette
- Include only one complete avatar, no other elements

This avatar will be used directly as a user profile picture, ensure it's a clean, single front-facing avatar image without any extra elements.`;

      console.log('Using DALL-E 3 to generate Minecraft-style pixel art...');
      const result = await retryWithDelay(
        async () =>
          await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024', // Reduce image size, more suitable for avatars
            quality: 'standard', // Use standard quality to speed up generation
            style: 'vivid',
          }),
        5 // 5 retries
      );
      if (result.data[0].url) {
        // Update request count
        await prisma.macAddressLimit.update({
          where: { macAddress },
          data: {
            dailyRequestCount: macRecord.dailyRequestCount + 1,
            lastRequestDate: new Date(),
          },
        });
        console.log('Minecraft style image generation successful');
        return NextResponse.json({
          imageUrl: result.data[0].url,
          remainingRequests: DAILY_REQUEST_LIMIT - (macRecord.dailyRequestCount + 1),
        });
      } else {
        console.error('Minecraft style image generation failed');
        return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
      }
    } else {
      // Enhanced prompt focusing on single avatar generation
      const prompt = `Create a clean square Minecraft-style pixel avatar without any extra elements:

${imageAnalysis}

[IMPORTANT] This is the final product for an avatar, must follow these requirements:
1. The entire image must contain only one main character avatar, no other views or reference elements
2. Absolutely no color palettes, reference images, design elements, UI interfaces, or dividing lines
3. Absolutely no arrows, labels, text explanations, or auxiliary graphics anywhere in the image
4. Absolutely no splitting the image into multiple parts or multiple angles
5. Background must be a single solid color, no patterns or gradients
6. Must be a complete work, directly usable as an avatar, no cropping needed

Minecraft style requirements:
1. Use clear pixel blocks for representation, like Minecraft skins
2. Facial details must be precise (eyes, lips highly similar to original)
3. Accessories like butterfly hairpins must be accurately represented, including color and position
4. Hair color and style must match the original
5. Details like necklaces and tattoos should be preserved but represented in pixel style

The final product must be a single, complete, standalone Minecraft-style character avatar without any other elements, like a pre-cropped avatar image. This image will be used directly in the user interface, requiring no post-editing.`;

      console.log('Using DALL-E 3 to generate Minecraft-style pixel art...');
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

      // wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // updated request count
      await prisma.macAddressLimit.update({
        where: { macAddress },
        data: {
          dailyRequestCount: macRecord.dailyRequestCount + 1,
          lastRequestDate: new Date(),
        },
      });

      console.log('Minecraft style image generation successful');
      return NextResponse.json({
        imageUrl: result.data[0].url,
        analysis: imageAnalysis,
        remainingRequests: DAILY_REQUEST_LIMIT - (macRecord.dailyRequestCount + 1),
      });
    }
  } catch (error) {
    console.error('Processing failed:', error);
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    console.log('========== Pixel Art API Request End ==========');
  }
}
