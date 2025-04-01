'use client';
import React, { useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
const PixelArtGenerator = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [style, setStyle] = useState<string>('minecraft');
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  // 转换图像为PNG并限制大小
  const convertToPng = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        // 创建canvas并绘制图像
        const canvas = document.createElement('canvas');
        // 限制最大尺寸为800x800以减小文件大小
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          } else {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为PNG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 创建新的File对象
              const newFile = new File([blob], 'image.png', {
                type: 'image/png',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('转换图像失败'));
            }
          },
          'image/png',
          0.8
        ); // 压缩质量0.8
      };

      img.onerror = () => reject(new Error('加载图像失败'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    // 验证文件大小（4MB = 4 * 1024 * 1024 bytes）
    const maxSize = 4 * 1024 * 1024; // 4MB in bytes
    if (file.size > maxSize) {
      setError('图片大小不能超过4MB');
      return;
    }

    // 显示原始图像
    const reader = new FileReader();
    reader.onload = (event) => {
      setOriginalImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 保存文件
    setUploadedFile(file);
  };

  const getDeviceIdentifier = async () => {
    // 首先检查本地存储中是否已有设备ID
    let deviceId = localStorage.getItem('device_identifier');

    // 如果没有存储的ID，则生成一个新的
    if (!deviceId) {
      // 创建一个基于浏览器特征的简单指纹
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        navigator.platform,
      ].join('_');

      // 简单哈希函数
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        hash = (hash << 5) - hash + fingerprint.charCodeAt(i);
        hash |= 0; // 转为32位整数
      }

      deviceId = `device_${Math.abs(hash).toString(16)}_${Date.now().toString(16)}`;
      localStorage.setItem('device_identifier', deviceId);
    }

    return deviceId;
  };

  const generateImage = async () => {
    if (!uploadedFile) {
      setError('请先上传图片');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 获取设备ID
      const deviceId = await getDeviceIdentifier();

      // 转换为PNG格式并限制大小
      const pngFile = await convertToPng(uploadedFile);

      // 创建FormData对象直接发送文件
      const formData = new FormData();
      formData.append('image', pngFile);
      formData.append('style', style);

      const response = await axios.post('/api/generate-pixel-art', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-MAC-Address': deviceId, // 添加设备ID作为MAC地址
        },
      });

      if (response.data && response.data.imageUrl) {
        setGeneratedImage(response.data.imageUrl);

        // 显示剩余请求次数
        if (response.data.remainingRequests !== undefined) {
          setRemainingRequests(response.data.remainingRequests);
        }
      } else {
        setError('转换图像失败');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || '请求错误，请稍后再试';
      setError(`API请求错误: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `pixel_art_${style}.png`;
    link.click();
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">像素艺术图片生成器</h1>

      <div className="w-full">
        <label className="mb-2 block font-medium">选择风格:</label>
        <select value={style} onChange={(e) => setStyle(e.target.value)} className="mb-4 w-full rounded-md border p-2">
          <option value="minecraft">我的世界像素风格</option>
        </select>

        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full rounded-md border p-2" />
      </div>

      <button
        onClick={generateImage}
        disabled={loading || !uploadedFile}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading
          ? '生成中...'
          : `生成${style === 'minecraft' ? '我的世界' : style === 'anime' ? '动漫' : '吉卜力'}像素艺术`}
      </button>

      {error && <div className="text-red-500">{error}</div>}

      {remainingRequests !== null && <div className="mt-2 text-blue-600">今日剩余请求次数: {remainingRequests}</div>}

      {/* 两张图片并排显示，限制尺寸为300px */}
      <div className="flex w-full flex-row flex-wrap justify-center gap-8">
        {originalImage && (
          <div className="flex flex-col items-center">
            <h2 className="mb-2 text-lg font-medium">原始图像</h2>
            <div className="overflow-hidden rounded-lg border" style={{ width: '300px', height: '300px' }}>
              <Image src={originalImage} alt="原始图像" className="h-full w-full object-cover" width={300} height={300} />
            </div>
          </div>
        )}

        {generatedImage && (
          <div className="flex flex-col items-center">
            <h2 className="mb-2 text-lg font-medium">生成的像素艺术</h2>
            <div className="overflow-hidden rounded-lg border" >
              <Image src={generatedImage} alt="生成的像素艺术" className="h-full w-full object-cover" width={300} height={300} />
            </div>
          </div>
        )}
      </div>

      {/* 下载按钮 */}
      {generatedImage && (
        <button onClick={downloadImage} className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          下载像素艺术图像
        </button>
      )}
    </div>
  );
};

export default PixelArtGenerator;
