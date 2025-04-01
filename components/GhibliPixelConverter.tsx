'use client';
import React, { useState, useRef, useEffect } from 'react';

const GhibliPixelConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  // 吉卜力风格参数
  const [ghibliIntensity, setGhibliIntensity] = useState(7); // 吉卜力风格强度
  const [colorMode, setColorMode] = useState('nature'); // 颜色模式

  // 像素化参数
  const [pixelSize, setPixelSize] = useState(8); // 像素块大小
  const [colorCount, setColorCount] = useState(32); // 颜色数量
  const [edgeEnhance, setEdgeEnhance] = useState(4); // 边缘增强

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);

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

  // 应用吉卜力风格颜色
  const applyGhibliColors = (ctx: CanvasRenderingContext2D, mode: string, intensity: number) => {
    const intensityFactor = intensity / 10; // 将强度转换为0-1的系数
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    // 不同的颜色模式使用不同的色彩处理
    switch (mode) {
      case 'totoro': // 《龙猫》风格 - 自然绿色和蓝色
        for (let i = 0; i < data.length; i += 4) {
          // 增强绿色和蓝色，降低红色
          data[i] = Math.min(255, data[i] * (1 - 0.2 * intensityFactor));
          data[i + 1] = Math.min(255, data[i + 1] * (1 + 0.15 * intensityFactor));
          data[i + 2] = Math.min(255, data[i + 2] * (1 + 0.1 * intensityFactor));

          // 增加自然的暖色调
          if (data[i] > 150 && data[i + 1] > 150) {
            data[i] = Math.min(255, data[i] * 1.1);
            data[i + 1] = Math.min(255, data[i + 1] * 1.05);
          }
        }
        break;

      case 'spirited': // 《千与千寻》风格 - 柔和的蓝紫色调
        for (let i = 0; i < data.length; i += 4) {
          // 计算亮度
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

          if (brightness > 200) {
            // 高光区域
            // 增加淡蓝色
            data[i] = Math.min(255, data[i] * 0.9);
            data[i + 1] = Math.min(255, data[i + 1] * 0.95);
            data[i + 2] = Math.min(255, data[i + 2] * 1.1);
          } else if (brightness > 100) {
            // 中间调
            // 略微偏紫
            data[i] = Math.min(255, data[i] * 1.05);
            data[i + 1] = Math.min(255, data[i + 1] * 0.95);
            data[i + 2] = Math.min(255, data[i + 2] * 1.1);
          } else {
            // 暗部
            // 更暗的蓝紫色
            data[i] = Math.min(255, data[i] * 0.9);
            data[i + 1] = Math.min(255, data[i + 1] * 0.9);
            data[i + 2] = Math.min(255, data[i + 2] * 1.05);
          }
        }
        break;

      case 'mononoke': // 《幽灵公主》风格 - 对比强烈的绿色和红色
        for (let i = 0; i < data.length; i += 4) {
          // 计算亮度
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

          // 增加对比度
          const contrastFactor = 1.2 * intensityFactor;
          data[i] = Math.min(255, Math.max(0, data[i] + (data[i] - 128) * contrastFactor));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (data[i + 1] - 128) * contrastFactor));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (data[i + 2] - 128) * contrastFactor));

          // 增强绿色和红色
          if (data[i + 1] > data[i] && data[i + 1] > data[i + 2]) {
            // 绿色区域增强
            data[i + 1] = Math.min(255, data[i + 1] * (1 + 0.2 * intensityFactor));
          } else if (data[i] > data[i + 1] && data[i] > data[i + 2]) {
            // 红色区域增强
            data[i] = Math.min(255, data[i] * (1 + 0.2 * intensityFactor));
          }
        }
        break;

      case 'castle': // 《哈尔的移动城堡》风格 - 温暖的棕黄色调
        for (let i = 0; i < data.length; i += 4) {
          // 向暖黄色调偏移
          data[i] = Math.min(255, data[i] * (1 + 0.15 * intensityFactor));
          data[i + 1] = Math.min(255, data[i + 1] * (1 + 0.1 * intensityFactor));
          data[i + 2] = Math.min(255, data[i + 2] * (1 - 0.05 * intensityFactor));

          // 增加复古感
          const sepia = 0.2 * intensityFactor;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          data[i] = Math.min(255, r * (1 - sepia) + (r * 0.769 + g * 0.686 + b * 0.534) * sepia);
          data[i + 1] = Math.min(255, g * (1 - sepia) + (r * 0.349 + g * 0.686 + b * 0.168) * sepia);
          data[i + 2] = Math.min(255, b * (1 - sepia) + (r * 0.272 + g * 0.534 + b * 0.131) * sepia);
        }
        break;

      case 'nature': // 一般自然风格
      default:
        for (let i = 0; i < data.length; i += 4) {
          // 柔和的自然色调
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

          if (brightness > 180) {
            // 高光区域
            // 保持明亮但稍微柔和
            const factor = 0.05 * intensityFactor;
            data[i] = data[i] * (1 - factor) + brightness * factor;
            data[i + 1] = data[i + 1] * (1 - factor) + brightness * factor;
            data[i + 2] = data[i + 2] * (1 - factor) + brightness * factor;
          } else if (brightness > 100) {
            // 中间调
            // 稍微增加色彩饱和度
            const avg = brightness;
            const satFactor = 0.1 * intensityFactor;
            data[i] = Math.min(255, data[i] + (data[i] - avg) * satFactor);
            data[i + 1] = Math.min(255, data[i + 1] + (data[i + 1] - avg) * satFactor);
            data[i + 2] = Math.min(255, data[i + 2] + (data[i + 2] - avg) * satFactor);
          } else {
            // 暗部
            // 稍微提高暗部细节
            const liftFactor = 0.1 * intensityFactor;
            data[i] = Math.min(255, data[i] * (1 - liftFactor) + 30 * liftFactor);
            data[i + 1] = Math.min(255, data[i + 1] * (1 - liftFactor) + 30 * liftFactor);
            data[i + 2] = Math.min(255, data[i + 2] * (1 - liftFactor) + 30 * liftFactor);
          }
        }
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // 应用简单的线条增强，吉卜力常有清晰的线条
  const enhanceGhibliOutlines = (ctx: CanvasRenderingContext2D, strength: number = 3) => {
    if (strength <= 0) return;

    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 创建一个临时数组，存储结果
    const tempData = new Uint8ClampedArray(data);

    // 边缘检测阈值
    const threshold = 30;

    // 寻找边缘
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // 获取相邻像素
        const top = ((y - 1) * width + x) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;

        // 检查亮度差异
        const currentBrightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const topBrightness = (data[top] + data[top + 1] + data[top + 2]) / 3;
        const bottomBrightness = (data[bottom] + data[bottom + 1] + data[bottom + 2]) / 3;
        const leftBrightness = (data[left] + data[left + 1] + data[left + 2]) / 3;
        const rightBrightness = (data[right] + data[right + 1] + data[right + 2]) / 3;

        // 计算亮度差异
        const diffY = Math.abs(topBrightness - bottomBrightness);
        const diffX = Math.abs(leftBrightness - rightBrightness);

        // 如果亮度差异大于阈值，则认为是边缘
        if (diffX > threshold || diffY > threshold) {
          // 使边缘更暗
          const darkFactor = 1 - strength / 10;
          tempData[idx] = data[idx] * darkFactor;
          tempData[idx + 1] = data[idx + 1] * darkFactor;
          tempData[idx + 2] = data[idx + 2] * darkFactor;
        }
      }
    }

    // 应用变更
    for (let i = 0; i < data.length; i++) {
      data[i] = tempData[i];
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // 量化颜色 - 减少颜色数量
  const quantizeColors = (imageData: ImageData, colors: number): ImageData => {
    const data = imageData.data;
    const step = Math.floor(256 / Math.cbrt(colors));

    for (let i = 0; i < data.length; i += 4) {
      // 对RGB通道进行量化
      data[i] = Math.floor(data[i] / step) * step;
      data[i + 1] = Math.floor(data[i + 1] / step) * step;
      data[i + 2] = Math.floor(data[i + 2] / step) * step;
    }

    return imageData;
  };

  // 边缘检测和增强
  const enhanceEdges = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (strength <= 0) return;

    const canvas = ctx.canvas;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 创建副本用于边缘检测
    const output = new Uint8ClampedArray(data);

    // 使用简单的Sobel滤波器进行边缘检测
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // 中心像素索引
        const idx = (y * width + x) * 4;

        // 计算梯度
        const gx =
          -data[((y - 1) * width + (x - 1)) * 4] +
          data[((y - 1) * width + (x + 1)) * 4] +
          -2 * data[(y * width + (x - 1)) * 4] +
          2 * data[(y * width + (x + 1)) * 4] +
          -data[((y + 1) * width + (x - 1)) * 4] +
          data[((y + 1) * width + (x + 1)) * 4];

        const gy =
          -data[((y - 1) * width + (x - 1)) * 4] +
          -2 * data[((y - 1) * width + x) * 4] +
          -data[((y - 1) * width + (x + 1)) * 4] +
          data[((y + 1) * width + (x - 1)) * 4] +
          2 * data[((y + 1) * width + x) * 4] +
          data[((y + 1) * width + (x + 1)) * 4];

        // 梯度强度
        const g = Math.sqrt(gx * gx + gy * gy);

        // 如果检测到边缘，增强边缘
        if (g > 20) {
          // 阈值
          // 增强边缘 - 使颜色更深
          output[idx] = Math.max(0, data[idx] - strength * 25);
          output[idx + 1] = Math.max(0, data[idx + 1] - strength * 25);
          output[idx + 2] = Math.max(0, data[idx + 2] - strength * 25);
        }
      }
    }

    // 更新画布
    ctx.putImageData(new ImageData(output, width, height), 0, 0);
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

      // 处理像素化图像
      const processedCanvas = processedCanvasRef.current;
      if (!processedCanvas) return;
      const processedCtx = processedCanvas.getContext('2d');
      if (!processedCtx) return;

      // 设置处理画布尺寸
      processedCanvas.width = img.width;
      processedCanvas.height = img.height;

      // 创建临时画布用于风格处理
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // 绘制原始图像到临时画布
      tempCtx.drawImage(img, 0, 0, img.width, img.height);

      // 第1步：应用吉卜力风格颜色处理
      applyGhibliColors(tempCtx, colorMode, ghibliIntensity);

      // 第2步：增强轮廓线条（吉卜力特色）
      enhanceGhibliOutlines(tempCtx, ghibliIntensity);

      // 第3步：像素化处理
      // 创建小画布进行下采样
      const smallCanvas = document.createElement('canvas');
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return;

      // 设置小画布尺寸
      smallCanvas.width = Math.ceil(img.width / pixelSize);
      smallCanvas.height = Math.ceil(img.height / pixelSize);

      // 绘制临时处理后的图像到小画布
      smallCtx.drawImage(tempCanvas, 0, 0, smallCanvas.width, smallCanvas.height);

      // 应用颜色量化
      if (colorCount < 256) {
        let smallImgData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
        smallImgData = quantizeColors(smallImgData, colorCount);
        smallCtx.putImageData(smallImgData, 0, 0);
      }

      // 禁用平滑处理以保持像素边缘清晰
      processedCtx.imageSmoothingEnabled = false;

      // 放大绘制回原始大小，从而产生像素效果
      processedCtx.drawImage(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height, 0, 0, img.width, img.height);

      // 应用边缘增强
      if (edgeEnhance > 0) {
        enhanceEdges(processedCtx, edgeEnhance);
      }

      // 保存处理后的图像
      setProcessedImage(processedCanvas.toDataURL());
    };
    img.src = originalImage;
  }, [originalImage, pixelSize, colorCount, ghibliIntensity, colorMode, edgeEnhance]);

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
              <h2 className="mb-2 text-lg font-medium">吉卜力像素风格图片</h2>
              <div className="overflow-hidden rounded-lg border">
                <canvas ref={processedCanvasRef} className="h-auto max-w-full" />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <div className="mb-2 rounded-lg bg-gray-100 p-3">
              <h3 className="mb-2 font-medium">吉卜力风格设置</h3>
              <label className="flex items-center gap-2">
                <span>吉卜力风格:</span>
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value)}
                  className="rounded border px-2 py-1"
                >
                  <option value="totoro">龙猫风格</option>
                  <option value="spirited">千与千寻风格</option>
                  <option value="mononoke">幽灵公主风格</option>
                  <option value="castle">哈尔移动城堡风格</option>
                  <option value="nature">自然风格</option>
                </select>
              </label>

              <label className="mt-2 flex items-center gap-2">
                <span>风格强度:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={ghibliIntensity}
                  onChange={(e) => setGhibliIntensity(Number(e.target.value))}
                  className="flex-1"
                />
                <span>{ghibliIntensity}</span>
              </label>
            </div>

            <div className="rounded-lg bg-gray-100 p-3">
              <h3 className="mb-2 font-medium">像素化设置</h3>
              <label className="flex items-center gap-2">
                <span>像素大小:</span>
                <input
                  type="range"
                  min="4"
                  max="20"
                  value={pixelSize}
                  onChange={(e) => setPixelSize(Number(e.target.value))}
                  className="flex-1"
                />
                <span>{pixelSize}px</span>
              </label>

              <label className="mt-2 flex items-center gap-2">
                <span>颜色数量:</span>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={colorCount}
                  onChange={(e) => setColorCount(Number(e.target.value))}
                  className="flex-1"
                />
                <span>{colorCount}</span>
              </label>

              <label className="mt-2 flex items-center gap-2">
                <span>边缘增强:</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={edgeEnhance}
                  onChange={(e) => setEdgeEnhance(Number(e.target.value))}
                  className="flex-1"
                />
                <span>{edgeEnhance}</span>
              </label>
            </div>

            <button
              onClick={() => {
                if (!processedImage) return;
                const link = document.createElement('a');
                link.href = processedImage;
                link.download = 'ghibli_pixel_art.png';
                link.click();
              }}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              下载吉卜力像素风格图片
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GhibliPixelConverter;
