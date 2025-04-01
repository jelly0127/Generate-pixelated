'use client';
import React, { useState, useRef, useEffect } from 'react';

const MinecraftConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [blockSize, setBlockSize] = useState(16); // Minecraft风格的方块大小
  const [colorCount, setColorCount] = useState(32); // 限制颜色数量
  const [addShading, setAddShading] = useState(true); // 添加3D阴影效果
  const [outlineBlocks, setOutlineBlocks] = useState(true); // 方块描边
  const [depth3D, setDepth3D] = useState(5); // 3D深度效果强度
  const [lightDirection, setLightDirection] = useState(45); // 光源方向（角度）

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

  // 量化颜色函数 - 将颜色数量减少到指定数量
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

  // 添加方块轮廓
  const addBlockOutlines = (ctx: CanvasRenderingContext2D, blockSize: number) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;

    // 绘制垂直线
    for (let x = 0; x <= width; x += blockSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 绘制水平线
    for (let y = 0; y <= height; y += blockSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // 增强的3D效果，包括深度和光源方向
  const enhancedAdd3DShading = (
    ctx: CanvasRenderingContext2D,
    blockSize: number,
    depthFactor: number,
    lightAngle: number
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // 获取原始图像数据
    const originalData = ctx.getImageData(0, 0, width, height);

    // 创建临时画布进行高度图分析
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // 复制原始图像到临时画布
    tempCtx.putImageData(originalData, 0, 0);

    // 将原始图像转换为灰度图来表示高度
    const heightMap = ctx.createImageData(width, height);
    const heightData = heightMap.data;
    const origData = originalData.data;

    for (let i = 0; i < origData.length; i += 4) {
      // 通过RGB平均值计算亮度（作为高度）
      const brightness = (origData[i] + origData[i + 1] + origData[i + 2]) / 3;
      heightData[i] = heightData[i + 1] = heightData[i + 2] = brightness;
      heightData[i + 3] = origData[i + 3]; // 保持透明度
    }

    // 计算光源向量
    const lightRad = (lightAngle * Math.PI) / 180;
    const lightX = Math.cos(lightRad);
    const lightY = Math.sin(lightRad);

    // 创建新的ImageData来绘制3D效果
    const resultData = new ImageData(width, height);

    // 将原始图像数据复制到结果
    for (let i = 0; i < origData.length; i++) {
      resultData.data[i] = origData[i];
    }

    // 为每个方块添加3D效果
    for (let blockY = 0; blockY < height; blockY += blockSize) {
      for (let blockX = 0; blockX < width; blockX += blockSize) {
        // 获取方块中心的颜色
        const centerX = Math.min(blockX + Math.floor(blockSize / 2), width - 1);
        const centerY = Math.min(blockY + Math.floor(blockSize / 2), height - 1);
        const centerIndex = (centerY * width + centerX) * 4;

        // 获取中心点颜色
        const r = origData[centerIndex];
        const g = origData[centerIndex + 1];
        const b = origData[centerIndex + 2];
        const a = origData[centerIndex + 3];

        if (a < 128) continue; // 跳过透明区域

        // 计算方块高度 (0-255)
        const blockHeight = (r + g + b) / 3;

        // 创建方块的顶部、左侧、右侧、底部面
        const topShade = 1.2; // 顶面增亮
        const leftShade = 1.1; // 左面轻微增亮
        const rightShade = 0.8; // 右面暗化
        const bottomShade = 0.6; // 底面更暗

        // 渲染方块的不同面，使用不同的阴影系数
        for (let y = 0; y < blockSize && blockY + y < height; y++) {
          for (let x = 0; x < blockSize && blockX + x < width; x++) {
            const pixelIndex = ((blockY + y) * width + (blockX + x)) * 4;

            // 跳过透明区域
            if (origData[pixelIndex + 3] < 128) continue;

            // 默认使用原始颜色
            let shade = 1.0;

            // 计算像素在方块中的相对位置 (0-1)
            const relX = x / blockSize;
            const relY = y / blockSize;

            // 将方块分为四个部分用于着色
            // 根据光源方向和相对位置确定是哪个面

            // 3D凸起效果 - 基于深度系数
            const depthOffset = (blockHeight / 255) * depthFactor;

            // 顶部面 (亮)
            if (relY < 0.3 - (0.2 * depthOffset / 10)) {
              shade = topShade;
            }
            // 左侧面 (较亮)
            else if (relX < 0.3 - (0.2 * depthOffset / 10) && lightX < 0) {
              shade = leftShade;
            }
            // 右侧面 (较暗)
            else if (relX > 0.7 + (0.2 * depthOffset / 10) && lightX > 0) {
              shade = rightShade;
            }
            // 底部面 (暗)
            else if (relY > 0.7 + (0.2 * depthOffset / 10)) {
              shade = bottomShade;
            }

            // 3D效果 - 基于方块边缘的距离添加边角阴影
            const edgeX = Math.min(relX, 1 - relX) * 2;
            const edgeY = Math.min(relY, 1 - relY) * 2;
            const edgeFactor = Math.min(edgeX, edgeY);

            // 边缘额外阴影
            if (edgeFactor < 0.3) {
              shade *= 0.8 + (edgeFactor * 0.7);
            }

            // 应用阴影到RGB通道
            resultData.data[pixelIndex] = Math.min(255, Math.max(0, Math.round(origData[pixelIndex] * shade)));
            resultData.data[pixelIndex + 1] = Math.min(255, Math.max(0, Math.round(origData[pixelIndex + 1] * shade)));
            resultData.data[pixelIndex + 2] = Math.min(255, Math.max(0, Math.round(origData[pixelIndex + 2] * shade)));
          }
        }
      }
    }

    // 绘制结果
    ctx.putImageData(resultData, 0, 0);

    // 为提升立体感，添加方块投影
    if (depthFactor > 3) {
      // 添加方块悬浮效果的投影
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = 'black';

      for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
          // 获取方块中心的透明度
          const centerX = Math.min(x + Math.floor(blockSize / 2), width - 1);
          const centerY = Math.min(y + Math.floor(blockSize / 2), height - 1);
          const centerIndex = (centerY * width + centerX) * 4;

          // 如果方块不透明，添加投影
          if (origData[centerIndex + 3] > 128) {
            const brightness = (origData[centerIndex] + origData[centerIndex + 1] + origData[centerIndex + 2]) / 3;
            const shadowSize = depthFactor * (brightness / 255) * 0.3;

            // 在方块下方绘制阴影
            ctx.fillRect(
              x + blockSize * 0.1,
              y + blockSize * (1 + 0.05),
              blockSize * 0.8,
              shadowSize * blockSize
            );
          }
        }
      }
      ctx.restore();
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

      // 处理像素化图像
      const pixCanvas = pixelatedCanvasRef.current;
      if (!pixCanvas) return;
      const pixCtx = pixCanvas.getContext('2d');
      if (!pixCtx) return;

      // 设置像素化画布的尺寸
      pixCanvas.width = img.width;
      pixCanvas.height = img.height;

      // 创建小画布进行下采样
      const smallCanvas = document.createElement('canvas');
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return;

      // 计算缩小比例
      smallCanvas.width = Math.ceil(img.width / blockSize);
      smallCanvas.height = Math.ceil(img.height / blockSize);

      // 将原始图像绘制到小画布上
      smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);

      // 获取小画布的图像数据并进行颜色量化
      let smallImageData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
      smallImageData = quantizeColors(smallImageData, colorCount);
      smallCtx.putImageData(smallImageData, 0, 0);

      // 禁用平滑处理以确保清晰的像素边缘
      pixCtx.imageSmoothingEnabled = false;

      // 将小画布放大回原始大小，创建方块效果
      pixCtx.drawImage(
        smallCanvas,
        0, 0, smallCanvas.width, smallCanvas.height,
        0, 0, img.width, img.height
      );

      // 根据选项添加增强的3D阴影效果
      if (addShading) {
        enhancedAdd3DShading(pixCtx, blockSize, depth3D, lightDirection);
      }

      // 根据选项添加方块轮廓
      if (outlineBlocks) {
        addBlockOutlines(pixCtx, blockSize);
      }

      // 保存处理后的图像
      setPixelatedImage(pixCanvas.toDataURL());
    };
    img.src = originalImage;
  }, [originalImage, blockSize, colorCount, addShading, outlineBlocks, depth3D, lightDirection]);

  const downloadPixelatedImage = () => {
    if (!pixelatedImage) return;

    const link = document.createElement('a');
    link.href = pixelatedImage;
    link.download = 'minecraft_style_image.png';
    link.click();
  };

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
              <h2 className="text-lg font-medium mb-2">我的世界风格图片</h2>
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
              <span>方块大小:</span>
              <input
                type="range"
                min="8"
                max="32"
                value={blockSize}
                onChange={(e) => setBlockSize(Number(e.target.value))}
                className="flex-1"
              />
              <span>{blockSize}px</span>
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

            {addShading && (
              <>
                <label className="flex items-center gap-2">
                  <span>3D深度:</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={depth3D}
                    onChange={(e) => setDepth3D(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span>{depth3D}</span>
                </label>

                <label className="flex items-center gap-2">
                  <span>光源角度:</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={lightDirection}
                    onChange={(e) => setLightDirection(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span>{lightDirection}°</span>
                </label>
              </>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addShading}
                  onChange={(e) => setAddShading(e.target.checked)}
                />
                <span>添加3D阴影效果</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={outlineBlocks}
                  onChange={(e) => setOutlineBlocks(e.target.checked)}
                />
                <span>显示方块轮廓</span>
              </label>
            </div>

            <button
              onClick={downloadPixelatedImage}
              className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              下载我的世界风格图片
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MinecraftConverter; 