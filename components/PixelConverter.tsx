'use client';
import React, { useState, useRef, useEffect } from 'react';

const PixelConverter = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(8); // 像素块大小
  const [preBlur, setPreBlur] = useState(0); // 预处理高斯模糊强度
  const [postBlur, setPostBlur] = useState(0); // 后处理高斯模糊强度

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

  // 应用高斯模糊到Canvas
  const applyGaussianBlur = (canvas: HTMLCanvasElement, radius: number) => {
    if (radius <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 使用CSS滤镜实现高斯模糊 (更简单的方法)
    ctx.filter = `blur(${radius}px)`;

    // 保存原始图像数据
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 重新绘制图像，应用滤镜
    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0);

    // 重置滤镜
    ctx.filter = 'none';
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

      // 像素化处理
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
      const scale = pixelSize;
      smallCanvas.width = Math.ceil(img.width / scale);
      smallCanvas.height = Math.ceil(img.height / scale);

      // 绘制缩小的图像，使用已经应用了高斯模糊的临时画布
      smallCtx.drawImage(tempCanvas, 0, 0, smallCanvas.width, smallCanvas.height);

      // 禁用平滑处理以保持像素边缘清晰
      pixCtx.imageSmoothingEnabled = false;

      // 放大绘制回原始大小，从而产生像素效果
      pixCtx.drawImage(
        smallCanvas,
        0, 0, smallCanvas.width, smallCanvas.height,
        0, 0, img.width, img.height
      );

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
  }, [originalImage, pixelSize, preBlur, postBlur]);

  const handlePixelSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelSize(Number(e.target.value));
  };

  const handlePreBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreBlur(Number(e.target.value));
  };

  const handlePostBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostBlur(Number(e.target.value));
  };

  const downloadPixelatedImage = () => {
    if (!pixelatedImage) return;

    const link = document.createElement('a');
    link.href = pixelatedImage;
    link.download = 'pixelated_image.png';
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
              <span>像素大小:</span>
              <input
                type="range"
                min="2"
                max="20"
                value={pixelSize}
                onChange={handlePixelSizeChange}
                className="flex-1"
              />
              <span>{pixelSize}px</span>
            </label>

            <label className="flex items-center gap-2">
              <span>预处理模糊:</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={preBlur}
                onChange={handlePreBlurChange}
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
                onChange={handlePostBlurChange}
                className="flex-1"
              />
              <span>{postBlur.toFixed(1)}</span>
            </label>

            <button
              onClick={downloadPixelatedImage}
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

export default PixelConverter; 