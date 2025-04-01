'use client';
import React, { useState, useRef, useEffect } from 'react';

const AnimePixelConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(10); // 像素块大小
  const [animeLevel, setAnimeLevel] = useState(5); // 动漫化强度
  const [colorCount, setColorCount] = useState(32); // 颜色数量
  const [contrastLevel, setContrastLevel] = useState(3); // 对比度增强
  const [edgeThickness, setEdgeThickness] = useState(3); // 边缘线条粗细
  const [saturation, setSaturation] = useState(2); // 饱和度
  const [colorShift, setColorShift] = useState(true); // 使用动漫风格色彩偏移

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelatedCanvasRef = useRef<HTMLCanvasElement>(null);

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

  // 动漫风格的边缘检测和增强
  const detectAndEnhanceEdges = (ctx: CanvasRenderingContext2D, thickness: number = 1, threshold: number = 20) => {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 创建新的ImageData用于存储结果
    const result = ctx.createImageData(width, height);
    const resultData = result.data;

    // 复制原始数据
    for (let i = 0; i < data.length; i++) {
      resultData[i] = data[i];
    }

    // 边缘检测
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = (y * width + x) * 4;
        const top = ((y - 1) * width + x) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;

        // 使用简单的边缘检测算法
        const edgeX =
          Math.abs(data[left] - data[right]) +
          Math.abs(data[left + 1] - data[right + 1]) +
          Math.abs(data[left + 2] - data[right + 2]);

        const edgeY =
          Math.abs(data[top] - data[bottom]) +
          Math.abs(data[top + 1] - data[bottom + 1]) +
          Math.abs(data[top + 2] - data[bottom + 2]);

        // 如果检测到边缘
        if (edgeX > threshold * 3 || edgeY > threshold * 3) {
          // 扩展边缘线条
          for (let ny = Math.max(0, y - thickness); ny <= Math.min(height - 1, y + thickness); ny++) {
            for (let nx = Math.max(0, x - thickness); nx <= Math.min(width - 1, x + thickness); nx++) {
              // 距离中心点
              const dx = nx - x;
              const dy = ny - y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              // 只在指定半径内绘制
              if (dist <= thickness) {
                const idx = (ny * width + nx) * 4;
                // 设置为黑色，动漫风格的边缘线
                resultData[idx] = 0;
                resultData[idx + 1] = 0;
                resultData[idx + 2] = 0;
                // 保持原有的透明度
                resultData[idx + 3] = data[idx + 3];
              }
            }
          }
        }
      }
    }

    // 更新图像
    ctx.putImageData(result, 0, 0);
  };

  // 应用动漫风格的简化和色彩增强
  const applyAnimeStyle = (
    ctx: CanvasRenderingContext2D,
    level: number = 5,
    contrast: number = 0,
    colorShift: boolean = false,
    saturationLevel: number = 0
  ) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 标准化动漫化等级 (1-10)
    const simplifyFactor = level / 10;

    // 颜色区域
    const regions: { [key: string]: { r: number; g: number; b: number; count: number } } = {};

    // 第一步：简化颜色，合并相似区域
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // 跳过透明像素

      // 简化颜色
      const r = Math.round(data[i] / (255 * simplifyFactor)) * (255 * simplifyFactor);
      const g = Math.round(data[i + 1] / (255 * simplifyFactor)) * (255 * simplifyFactor);
      const b = Math.round(data[i + 2] / (255 * simplifyFactor)) * (255 * simplifyFactor);

      // 存储到区域
      const key = `${r},${g},${b}`;
      if (!regions[key]) {
        regions[key] = { r: 0, g: 0, b: 0, count: 0 };
      }

      regions[key].r += data[i];
      regions[key].g += data[i + 1];
      regions[key].b += data[i + 2];
      regions[key].count++;
    }

    // 计算每个区域的平均颜色
    for (const key in regions) {
      const region = regions[key];
      region.r = Math.round(region.r / region.count);
      region.g = Math.round(region.g / region.count);
      region.b = Math.round(region.b / region.count);
    }

    // 第二步：应用新的颜色和对比度
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // 跳过透明像素

      // 找到最接近的区域
      const r = Math.round(data[i] / (255 * simplifyFactor)) * (255 * simplifyFactor);
      const g = Math.round(data[i + 1] / (255 * simplifyFactor)) * (255 * simplifyFactor);
      const b = Math.round(data[i + 2] / (255 * simplifyFactor)) * (255 * simplifyFactor);

      const key = `${r},${g},${b}`;
      if (regions[key]) {
        // 使用区域的平均颜色
        data[i] = regions[key].r;
        data[i + 1] = regions[key].g;
        data[i + 2] = regions[key].b;

        // 应用对比度增强
        if (contrast > 0) {
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }

        // 应用饱和度调整
        if (saturationLevel !== 0) {
          // 转为HSL
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h,
            s,
            l = (max + min) / 2;

          if (max === min) {
            h = s = 0; // 灰度
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
              default:
                h = 0;
            }

            h /= 6;
          }

          // 调整饱和度
          s = Math.min(1, Math.max(0, s * (1 + saturationLevel / 10)));

          // 转回RGB
          const hueToRgb = (p: number, q: number, t: number): number => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          let r1, g1, b1;

          if (s === 0) {
            r1 = g1 = b1 = l;
          } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r1 = hueToRgb(p, q, h + 1 / 3);
            g1 = hueToRgb(p, q, h);
            b1 = hueToRgb(p, q, h - 1 / 3);
          }

          data[i] = Math.round(r1 * 255);
          data[i + 1] = Math.round(g1 * 255);
          data[i + 2] = Math.round(b1 * 255);
        }

        // 动漫风格的色彩偏移
        if (colorShift) {
          // 计算亮度
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

          // 根据亮度应用不同的色彩偏移
          if (brightness > 200) {
            // 高亮区域偏向冷色调，典型的动漫高光
            data[i] = Math.min(255, data[i] * 0.9);
            data[i + 1] = Math.min(255, data[i + 1] * 0.95);
            data[i + 2] = Math.min(255, data[i + 2] * 1.1);
          } else if (brightness > 150) {
            // 中亮区域稍微提亮，增加卡通感
            data[i] = Math.min(255, data[i] * 1.05);
            data[i + 1] = Math.min(255, data[i + 1] * 1.05);
            data[i + 2] = Math.min(255, data[i + 2] * 1.05);
          } else if (brightness > 100) {
            // 中间色调增强暖色调
            data[i] = Math.min(255, data[i] * 1.1);
            data[i + 1] = Math.min(255, data[i + 1] * 1.05);
            data[i + 2] = Math.min(255, data[i + 2] * 0.95);
          } else {
            // 暗部增强蓝紫色调，常见于动漫阴影
            data[i] = Math.min(255, data[i] * 0.9);
            data[i + 1] = Math.min(255, data[i + 1] * 0.85);
            data[i + 2] = Math.min(255, data[i + 2]);
          }
        }
      }
    }

    // 更新图像
    ctx.putImageData(imageData, 0, 0);
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

      // 创建临时画布用于处理
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // 绘制原始图像到临时画布
      tempCtx.drawImage(img, 0, 0, img.width, img.height);

      // 处理像素化图像
      const pixCanvas = pixelatedCanvasRef.current;
      if (!pixCanvas) return;
      const pixCtx = pixCanvas.getContext('2d');
      if (!pixCtx) return;

      // 设置像素化画布的尺寸
      pixCanvas.width = img.width;
      pixCanvas.height = img.height;

      // 1. 首先进行动漫风格处理
      tempCtx.drawImage(img, 0, 0, img.width, img.height);
      applyAnimeStyle(tempCtx, animeLevel, contrastLevel, colorShift, saturation);

      // 2. 检测和强化边缘
      if (edgeThickness > 0) {
        detectAndEnhanceEdges(tempCtx, edgeThickness, 15);
      }

      // 3. 像素化处理
      const smallCanvas = document.createElement('canvas');
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return;

      // 计算缩小比例
      smallCanvas.width = Math.ceil(img.width / pixelSize);
      smallCanvas.height = Math.ceil(img.height / pixelSize);

      // 绘制缩小的图像
      smallCtx.drawImage(tempCanvas, 0, 0, smallCanvas.width, smallCanvas.height);

      // 应用颜色量化
      if (colorCount < 256) {
        let smallImgData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
        smallImgData = quantizeColors(smallImgData, colorCount);
        smallCtx.putImageData(smallImgData, 0, 0);
      }

      // 禁用平滑处理以保持像素边缘清晰
      pixCtx.imageSmoothingEnabled = false;

      // 放大绘制回原始大小，从而产生像素效果
      pixCtx.drawImage(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height, 0, 0, img.width, img.height);

      // 保存像素化后的图像
      setPixelatedImage(pixCanvas.toDataURL());
    };
    img.src = originalImage;
  }, [originalImage, pixelSize, animeLevel, colorCount, contrastLevel, edgeThickness, saturation, colorShift]);

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
              <h2 className="mb-2 text-lg font-medium">动漫像素风格图片</h2>
              <div className="overflow-hidden rounded-lg border">
                <canvas ref={pixelatedCanvasRef} className="h-auto max-w-full" />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
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

            <label className="flex items-center gap-2">
              <span>动漫化强度:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={animeLevel}
                onChange={(e) => setAnimeLevel(Number(e.target.value))}
                className="flex-1"
              />
              <span>{animeLevel}</span>
            </label>

            <label className="flex items-center gap-2">
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

            <label className="flex items-center gap-2">
              <span>对比度:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={contrastLevel}
                onChange={(e) => setContrastLevel(Number(e.target.value))}
                className="flex-1"
              />
              <span>{contrastLevel}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>边缘粗细:</span>
              <input
                type="range"
                min="0"
                max="5"
                value={edgeThickness}
                onChange={(e) => setEdgeThickness(Number(e.target.value))}
                className="flex-1"
              />
              <span>{edgeThickness}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>饱和度:</span>
              <input
                type="range"
                min="-5"
                max="10"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="flex-1"
              />
              <span>{saturation}</span>
            </label>

            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={colorShift} onChange={(e) => setColorShift(e.target.checked)} />
                <span>动漫色彩偏移</span>
              </label>
            </div>

            <button
              onClick={() => {
                if (!pixelatedImage) return;
                const link = document.createElement('a');
                link.href = pixelatedImage;
                link.download = 'anime_pixel_art.png';
                link.click();
              }}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              下载动漫像素风格图片
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimePixelConverter;
