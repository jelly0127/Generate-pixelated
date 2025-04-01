'use client';
import React, { useState, useRef, useEffect } from 'react';

const GhibliStyleConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [styledImage, setStyledImage] = useState<string | null>(null);
  const [styleIntensity, setStyleIntensity] = useState(7); // 风格强度
  const [backgroundIntensity, setBackgroundIntensity] = useState(5); // 背景强度
  const [colorMode, setColorMode] = useState('warm'); // 颜色模式
  const [detailLevel, setDetailLevel] = useState(8); // 细节水平

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const styledCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setOriginalImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // 吉卜力调色板和色彩处理
  const applyGhibliColors = (ctx: CanvasRenderingContext2D, mode: string) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    // 不同的颜色模式使用不同的色彩处理方法
    switch (mode) {
      case 'warm': // 暖色调 (如《红猪》《哈尔的移动城堡》)
        for (let i = 0; i < data.length; i += 4) {
          // 增强红色和黄色，微调蓝色
          data[i] = Math.min(255, data[i] * 1.1);
          data[i + 1] = Math.min(255, data[i + 1] * 1.05);
          data[i + 2] = Math.min(255, data[i + 2] * 0.95);
        }
        break;

      case 'nature': // 自然色调 (如《龙猫》《千与千寻》)
        for (let i = 0; i < data.length; i += 4) {
          // 增强绿色和蓝色，创造清新的自然感
          data[i] = Math.min(255, data[i] * 0.95);
          data[i + 1] = Math.min(255, data[i + 1] * 1.1);
          data[i + 2] = Math.min(255, data[i + 2] * 1.05);
        }
        break;

      case 'pastel': // 柔和的粉彩色调
        for (let i = 0; i < data.length; i += 4) {
          // 将所有颜色向柔和的粉彩方向调整
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = Math.min(255, data[i] * 0.8 + avg * 0.3);
          data[i + 1] = Math.min(255, data[i + 1] * 0.8 + avg * 0.3);
          data[i + 2] = Math.min(255, data[i + 2] * 0.8 + avg * 0.3);
        }
        break;

      case 'fantasy': // 梦幻色调 (如《天空之城》)
        for (let i = 0; i < data.length; i += 4) {
          // 增强蓝色和白色高光，创造梦幻感
          data[i] = Math.min(255, data[i] * 0.9);
          data[i + 1] = Math.min(255, data[i + 1] * 0.95);
          data[i + 2] = Math.min(255, data[i + 2] * 1.15);
        }
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // 简化细节并增强线条
  const applyGhibliDetails = (ctx: CanvasRenderingContext2D, detailLevel: number) => {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // 使用高斯模糊来简化背景细节
    const blurRadius = (10 - detailLevel) * 0.5;
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // 增强边缘线条
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // 绘制当前图像
    tempCtx.drawImage(canvas, 0, 0);

    // 使用非常轻微的模糊
    tempCtx.filter = 'blur(0.5px)';
    tempCtx.drawImage(tempCanvas, 0, 0);
    tempCtx.filter = 'none';

    // 获取临时画布的图像数据
    const tempData = tempCtx.getImageData(0, 0, width, height);
    const data = tempData.data;

    // 获取原始画布的图像数据
    const origData = ctx.getImageData(0, 0, width, height).data;

    // 应用边缘增强
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;

        // 获取相邻像素
        const top = ((y - 1) * width + x) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;

        // 计算差异
        const diffR =
          Math.abs(origData[i] - origData[top]) +
          Math.abs(origData[i] - origData[bottom]) +
          Math.abs(origData[i] - origData[left]) +
          Math.abs(origData[i] - origData[right]);

        const diffG =
          Math.abs(origData[i + 1] - origData[top + 1]) +
          Math.abs(origData[i + 1] - origData[bottom + 1]) +
          Math.abs(origData[i + 1] - origData[left + 1]) +
          Math.abs(origData[i + 1] - origData[right + 1]);

        const diffB =
          Math.abs(origData[i + 2] - origData[top + 2]) +
          Math.abs(origData[i + 2] - origData[bottom + 2]) +
          Math.abs(origData[i + 2] - origData[left + 2]) +
          Math.abs(origData[i + 2] - origData[right + 2]);

        // 检测边缘
        const threshold = 150 - detailLevel * 10;
        if (diffR + diffG + diffB > threshold) {
          // 在边缘处增强对比度
          data[i] = Math.max(0, data[i] - 30);
          data[i + 1] = Math.max(0, data[i + 1] - 30);
          data[i + 2] = Math.max(0, data[i + 2] - 30);
        } else {
          // 非边缘区域稍微简化
          const factor = 0.95 + detailLevel * 0.005;
          data[i] = data[i] * factor;
          data[i + 1] = data[i + 1] * factor;
          data[i + 2] = data[i + 2] * factor;
        }
      }
    }

    // 将处理后的图像数据写回原始画布
    ctx.putImageData(tempData, 0, 0);
  };

  // 添加吉卜力风格的背景元素
  const applyGhibliBackground = (ctx: CanvasRenderingContext2D, intensity: number) => {
    if (intensity <= 0) return;

    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // 天空渐变效果
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    skyGradient.addColorStop(0, 'rgba(135, 206, 235, 0.2)'); // 淡蓝色
    skyGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = skyGradient;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, width, height * 0.6);

    // 根据强度绘制云彩
    const cloudCount = Math.floor(intensity / 2);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < cloudCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.4;
      const radius = 20 + Math.random() * 30;

      const cloudGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = cloudGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 恢复正常绘图模式
    ctx.globalCompositeOperation = 'source-over';
  };

  // 整体处理图像
  const applyGhibliStyle = (
    ctx: CanvasRenderingContext2D,
    styleIntensity: number,
    colorMode: string,
    detailLevel: number,
    backgroundIntensity: number
  ) => {
    // 第1步：调整颜色
    applyGhibliColors(ctx, colorMode);

    // 第2步：处理细节和线条
    applyGhibliDetails(ctx, detailLevel);

    // 第3步：应用整体风格调整
    // 使用风格强度调整对比度和饱和度
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    // 应用吉卜力标志性的柔和高光和阴影
    for (let i = 0; i < data.length; i += 4) {
      // 计算亮度
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

      // 增强高光区域的柔和感
      if (brightness > 200) {
        // 柔化高光
        const factor = 1 - styleIntensity / 20;
        data[i] = data[i] * factor + brightness * (1 - factor);
        data[i + 1] = data[i + 1] * factor + brightness * (1 - factor);
        data[i + 2] = data[i + 2] * factor + brightness * (1 - factor);
      }

      // 保持中间色调鲜艳
      else if (brightness > 100) {
        // 增强饱和度
        const avg = brightness;
        const factor = 1 + styleIntensity / 20;
        data[i] = Math.min(255, (data[i] - avg) * factor + avg);
        data[i + 1] = Math.min(255, (data[i + 1] - avg) * factor + avg);
        data[i + 2] = Math.min(255, (data[i + 2] - avg) * factor + avg);
      }

      // 柔化暗部区域
      else {
        // 稍微提亮暗部
        const factor = styleIntensity / 20;
        data[i] = data[i] * (1 - factor) + 40 * factor;
        data[i + 1] = data[i + 1] * (1 - factor) + 40 * factor;
        data[i + 2] = data[i + 2] * (1 - factor) + 40 * factor;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 第4步：添加背景元素
    applyGhibliBackground(ctx, backgroundIntensity);
  };

  useEffect(() => {
    if (!originalImage) return;

    const img = new Image();
    img.onload = () => {
      // 绘制原始图像
      const origCanvas = originalCanvasRef.current;
      if (!origCanvas) return;
      const origCtx = origCanvas.getContext('2d');
      if (!origCtx) return;

      // 设置画布尺寸为图像尺寸
      origCanvas.width = img.width;
      origCanvas.height = img.height;
      origCtx.drawImage(img, 0, 0, img.width, img.height);

      // 处理风格化图像
      const styledCanvas = styledCanvasRef.current;
      if (!styledCanvas) return;
      const styledCtx = styledCanvas.getContext('2d');
      if (!styledCtx) return;

      // 设置风格化画布尺寸
      styledCanvas.width = img.width;
      styledCanvas.height = img.height;

      // 绘制原始图像到风格化画布
      styledCtx.drawImage(img, 0, 0, img.width, img.height);

      // 应用吉卜力风格处理
      applyGhibliStyle(styledCtx, styleIntensity, colorMode, detailLevel, backgroundIntensity);

      // 保存风格化图像
      setStyledImage(styledCanvas.toDataURL());
    };
    img.src = originalImage;
  }, [originalImage, styleIntensity, colorMode, detailLevel, backgroundIntensity]);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <div className="w-full">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {originalImage && (
        <>
          <div className="flex w-full flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <h2 className="mb-2 text-lg font-medium">原始图片</h2>
              <div className="overflow-hidden rounded-lg border">
                <canvas ref={originalCanvasRef} className="h-auto max-w-full" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="mb-2 text-lg font-medium">吉卜力风格图片</h2>
              <div className="overflow-hidden rounded-lg border">
                <canvas ref={styledCanvasRef} className="h-auto max-w-full" />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label className="flex items-center gap-2">
              <span>风格类型:</span>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
                className="rounded border px-2 py-1"
              >
                <option value="warm">暖色调 (红猪/哈尔)</option>
                <option value="nature">自然色调 (龙猫/千与千寻)</option>
                <option value="pastel">柔和色调 (起风了)</option>
                <option value="fantasy">梦幻色调 (天空之城)</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span>风格强度:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={styleIntensity}
                onChange={(e) => setStyleIntensity(Number(e.target.value))}
                className="flex-1"
              />
              <span>{styleIntensity}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>细节保留:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={detailLevel}
                onChange={(e) => setDetailLevel(Number(e.target.value))}
                className="flex-1"
              />
              <span>{detailLevel}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>背景效果:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={backgroundIntensity}
                onChange={(e) => setBackgroundIntensity(Number(e.target.value))}
                className="flex-1"
              />
              <span>{backgroundIntensity}</span>
            </label>

            <button
              onClick={() => {
                if (!styledImage) return;
                const link = document.createElement('a');
                link.href = styledImage;
                link.download = 'ghibli_style_image.png';
                link.click();
              }}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              下载吉卜力风格图片
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GhibliStyleConverter;
