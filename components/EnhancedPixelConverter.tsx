'use client';
import React, { useState, useRef, useEffect } from 'react';

const EnhancedPixelConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(8); // 像素块大小
  const [preBlur, setPreBlur] = useState(0); // 预处理高斯模糊强度
  const [postBlur, setPostBlur] = useState(0); // 后处理高斯模糊强度
  const [colorCount, setColorCount] = useState(32); // 颜色数量
  const [ditheringLevel, setDitheringLevel] = useState(0); // 抖动效果
  const [pixelStyle, setPixelStyle] = useState('sharp'); // 像素风格
  const [edgeEnhance, setEdgeEnhance] = useState(0); // 边缘增强
  const [saturation, setSaturation] = useState(0); // 饱和度调整

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

  // 量化颜色 - 减少图像中使用的颜色数量
  const quantizeColors = (imageData: ImageData, colorCount: number): ImageData => {
    const data = imageData.data;
    const step = Math.floor(256 / Math.cbrt(colorCount));

    for (let i = 0; i < data.length; i += 4) {
      // 对RGB通道进行量化
      data[i] = Math.floor(data[i] / step) * step;
      data[i + 1] = Math.floor(data[i + 1] / step) * step;
      data[i + 2] = Math.floor(data[i + 2] / step) * step;
      // Alpha通道保持不变
    }

    return imageData;
  };

  // 应用Floyd-Steinberg抖动算法
  const applyDithering = (imageData: ImageData, level: number): ImageData => {
    if (level <= 0) return imageData;

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const factor = level / 10; // 将0-10的等级转换为0-1的系数

    // 创建一个副本用于抖动处理
    const output = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        // 获取当前像素的原始颜色
        const oldR = output[i];
        const oldG = output[i + 1];
        const oldB = output[i + 2];

        // 获取量化后的颜色
        const step = Math.floor(256 / Math.cbrt(colorCount));
        const newR = Math.floor(oldR / step) * step;
        const newG = Math.floor(oldG / step) * step;
        const newB = Math.floor(oldB / step) * step;

        // 设置新的颜色
        output[i] = newR;
        output[i + 1] = newG;
        output[i + 2] = newB;

        // 计算量化误差
        const errR = (oldR - newR) * factor;
        const errG = (oldG - newG) * factor;
        const errB = (oldB - newB) * factor;

        // 分散误差到周围像素
        if (x + 1 < width) {
          // 右侧像素
          output[(y * width + x + 1) * 4] += errR * 7 / 16;
          output[(y * width + x + 1) * 4 + 1] += errG * 7 / 16;
          output[(y * width + x + 1) * 4 + 2] += errB * 7 / 16;

          if (y + 1 < height) {
            // 右下像素
            output[((y + 1) * width + x + 1) * 4] += errR * 1 / 16;
            output[((y + 1) * width + x + 1) * 4 + 1] += errG * 1 / 16;
            output[((y + 1) * width + x + 1) * 4 + 2] += errB * 1 / 16;
          }
        }

        if (y + 1 < height) {
          // 下方像素
          output[((y + 1) * width + x) * 4] += errR * 5 / 16;
          output[((y + 1) * width + x) * 4 + 1] += errG * 5 / 16;
          output[((y + 1) * width + x) * 4 + 2] += errB * 5 / 16;

          if (x > 0) {
            // 左下像素
            output[((y + 1) * width + x - 1) * 4] += errR * 3 / 16;
            output[((y + 1) * width + x - 1) * 4 + 1] += errG * 3 / 16;
            output[((y + 1) * width + x - 1) * 4 + 2] += errB * 3 / 16;
          }
        }
      }
    }

    // 创建新的ImageData并返回
    const result = new ImageData(output, width, height);
    return result;
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
        if (g > 20) { // 阈值
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

  // 调整饱和度
  const adjustSaturation = (ctx: CanvasRenderingContext2D, value: number) => {
    if (value === 0) return;

    const canvas = ctx.canvas;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // 饱和度系数
    const factor = 1 + value / 10;

    for (let i = 0; i < data.length; i += 4) {
      // 将RGB转换为HSL
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // 灰度
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: h = 0;
        }

        h /= 6;
      }

      // 调整饱和度
      s = Math.min(1, Math.max(0, s * factor));

      // 转回RGB
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

    ctx.putImageData(imgData, 0, 0);
  };

  // HSL转RGB的辅助函数
  const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  // 应用高斯模糊
  const applyGaussianBlur = (ctx: CanvasRenderingContext2D, radius: number) => {
    if (radius <= 0) return;

    // 使用CSS滤镜实现高斯模糊
    ctx.filter = `blur(${radius}px)`;

    // 保存原始图像数据
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 清除画布
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 重新绘制图像，应用滤镜
    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(ctx.canvas, 0, 0);

    // 重置滤镜
    ctx.filter = 'none';
  };

  // 根据风格应用后处理效果
  const applyPixelStyle = (ctx: CanvasRenderingContext2D, style: string) => {
    const canvas = ctx.canvas;

    switch (style) {
      case 'retro':
        // 复古风格 - 减少颜色和增加对比度
        let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          // 增加对比度
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 128));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.2 + 128));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.2 + 128));

          // 轻微偏移颜色平衡，增加复古感
          data[i] = Math.min(255, data[i] * 1.05); // 红色增强
          data[i + 2] = Math.min(255, data[i + 2] * 0.9); // 蓝色减弱
        }

        ctx.putImageData(imgData, 0, 0);
        break;

      case 'gameboy':
        // Game Boy风格 - 4种绿色
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gbData = imgData.data;
        const gbPalette = [
          [15, 56, 15],    // 最暗
          [48, 98, 48],    // 暗
          [139, 172, 15],  // 亮
          [155, 188, 15]   // 最亮
        ];

        for (let i = 0; i < gbData.length; i += 4) {
          // 计算灰度值
          const gray = (gbData[i] + gbData[i + 1] + gbData[i + 2]) / 3;
          let colorIndex;

          // 根据灰度值选择调色板颜色
          if (gray < 64) {
            colorIndex = 0;
          } else if (gray < 128) {
            colorIndex = 1;
          } else if (gray < 192) {
            colorIndex = 2;
          } else {
            colorIndex = 3;
          }

          gbData[i] = gbPalette[colorIndex][0];
          gbData[i + 1] = gbPalette[colorIndex][1];
          gbData[i + 2] = gbPalette[colorIndex][2];
        }

        ctx.putImageData(imgData, 0, 0);
        break;

      case 'arcade':
        // 街机风格 - 鲜艳色彩和黑色轮廓
        adjustSaturation(ctx, 5); // 增加饱和度
        enhanceEdges(ctx, 6);     // 强烈的边缘增强
        break;

      case 'crt':
        // CRT屏幕风格 - 添加扫描线
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const crtData = imgData.data;

        for (let y = 0; y < canvas.height; y++) {
          // 每隔一行添加扫描线效果
          if (y % 2 === 0) continue;

          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            // 使每隔一行的像素暗一点
            crtData[i] = Math.floor(crtData[i] * 0.85);
            crtData[i + 1] = Math.floor(crtData[i + 1] * 0.85);
            crtData[i + 2] = Math.floor(crtData[i + 2] * 0.85);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        break;

      case 'sharp':
      default:
        // 默认锐利像素风格，不做额外处理
        break;
    }
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

      // 应用预处理高斯模糊
      if (preBlur > 0) {
        tempCtx.filter = `blur(${preBlur}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
      }

      // 处理像素化图像
      const pixCanvas = pixelatedCanvasRef.current;
      if (!pixCanvas) return;
      const pixCtx = pixCanvas.getContext('2d');
      if (!pixCtx) return;

      // 设置像素化画布的尺寸
      pixCanvas.width = img.width;
      pixCanvas.height = img.height;

      // 像素化处理
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

        // 如果启用了抖动，应用抖动效果
        if (ditheringLevel > 0) {
          smallImgData = applyDithering(smallImgData, ditheringLevel);
        }

        smallCtx.putImageData(smallImgData, 0, 0);
      }

      // 禁用平滑处理以保持像素边缘清晰
      pixCtx.imageSmoothingEnabled = false;

      // 放大绘制回原始大小，从而产生像素效果
      pixCtx.drawImage(
        smallCanvas,
        0, 0, smallCanvas.width, smallCanvas.height,
        0, 0, img.width, img.height
      );

      // 应用后期效果

      // 应用像素风格
      applyPixelStyle(pixCtx, pixelStyle);

      // 调整饱和度
      if (saturation !== 0) {
        adjustSaturation(pixCtx, saturation);
      }

      // 应用边缘增强
      if (edgeEnhance > 0) {
        enhanceEdges(pixCtx, edgeEnhance);
      }

      // 应用后处理高斯模糊
      if (postBlur > 0) {
        pixCtx.filter = `blur(${postBlur}px)`;
        const pixelData = pixCtx.getImageData(0, 0, pixCanvas.width, pixCanvas.height);
        pixCtx.clearRect(0, 0, pixCanvas.width, pixCanvas.height);
        pixCtx.putImageData(pixelData, 0, 0);
        pixCtx.drawImage(pixCanvas, 0, 0);
        pixCtx.filter = 'none';
      }

      // 保存像素化后的图像
      setPixelatedImage(pixCanvas.toDataURL());
    };
    img.src = originalImage;
  }, [originalImage, pixelSize, preBlur, postBlur, colorCount, ditheringLevel, pixelStyle, edgeEnhance, saturation]);

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-6">
      <div className="w-full">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
        />
      </div>

      {originalImage && (
        <>
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-1">
              <h2 className="text-lg font-medium mb-2">原始图片</h2>
              <div className="overflow-hidden border rounded-lg">
                <canvas
                  ref={originalCanvasRef}
                  className="max-w-full h-auto"
                />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-medium mb-2">像素风格图片</h2>
              <div className="overflow-hidden border rounded-lg">
                <canvas
                  ref={pixelatedCanvasRef}
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <span>像素风格:</span>
              <select
                value={pixelStyle}
                onChange={(e) => setPixelStyle(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="sharp">锐利</option>
                <option value="retro">复古</option>
                <option value="gameboy">Game Boy</option>
                <option value="arcade">街机</option>
                <option value="crt">CRT显示器</option>
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span>像素大小:</span>
              <input
                type="range"
                min="2"
                max="20"
                value={pixelSize}
                onChange={(e) => setPixelSize(Number(e.target.value))}
                className="flex-1"
              />
              <span>{pixelSize}px</span>
            </label>

            <label className="flex items-center gap-2">
              <span>颜色数量:</span>
              <input
                type="range"
                min="4"
                max="256"
                value={colorCount}
                onChange={(e) => setColorCount(Number(e.target.value))}
                className="flex-1"
              />
              <span>{colorCount}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>抖动效果:</span>
              <input
                type="range"
                min="0"
                max="10"
                value={ditheringLevel}
                onChange={(e) => setDitheringLevel(Number(e.target.value))}
                className="flex-1"
              />
              <span>{ditheringLevel}</span>
            </label>

            <label className="flex items-center gap-2">
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

            <label className="flex items-center gap-2">
              <span>饱和度调整:</span>
              <input
                type="range"
                min="-10"
                max="10"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="flex-1"
              />
              <span>{saturation}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>预处理模糊:</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={preBlur}
                onChange={(e) => setPreBlur(Number(e.target.value))}
                className="flex-1"
              />
              <span>{preBlur.toFixed(1)}</span>
            </label>

            <label className="flex items-center gap-2">
              <span>后处理模糊:</span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={postBlur}
                onChange={(e) => setPostBlur(Number(e.target.value))}
                className="flex-1"
              />
              <span>{postBlur.toFixed(1)}</span>
            </label>

            <button
              onClick={() => {
                if (!pixelatedImage) return;
                const link = document.createElement('a');
                link.href = pixelatedImage;
                link.download = 'pixel_art_image.png';
                link.click();
              }}
              className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              下载像素风格图片
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedPixelConverter; 