'use client';
import React, { useState } from 'react';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
// import Image from 'next/image';
const PixelArtGenerator = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [style, setStyle] = useState<string>('minecraft');
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);


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
      setError('please upload a image file');
      return;
    }

    // 验证文件大小（4MB = 4 * 1024 * 1024 bytes）
    const maxSize = 4 * 1024 * 1024; // 4MB in bytes
    if (file.size > maxSize) {
      setError('image size must be less than 4MB');
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
      try {
        // 使用FingerprintJS创建更可靠的设备指纹
        const fp = await FingerprintJS.load();
        const result = await fp.get();

        // 获取指纹ID
        const visitorId = result.visitorId;

        // 加入额外的熵以增加唯一性
        deviceId = `device_${visitorId}_${Date.now().toString(16)}`;

        // 使用localStorage和IndexedDB双重存储
        localStorage.setItem('device_identifier', deviceId);

        // 在多个位置存储相同的ID，增加检测难度
        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('deviceTracking', 1);
            request.onupgradeneeded = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains('devices')) {
                db.createObjectStore('devices', { keyPath: 'id' });
              }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          const transaction = db.transaction(['devices'], 'readwrite');
          const store = transaction.objectStore('devices');
          store.put({ id: 'currentDevice', value: deviceId });
        } catch (err) {
          console.error('IndexedDB storage failed', err);
        }
      } catch (err) {
        // 回退到原始的生成方式
        console.error('fingerprint identification failed, using backup method', err);

        // 创建一个基于浏览器特征的简单指纹，与原来的代码一样
        const fingerprint = [
          navigator.userAgent,
          navigator.language,
          screen.width,
          screen.height,
          new Date().getTimezoneOffset(),
          navigator.platform,
          // 增加更多特征
          navigator.hardwareConcurrency || '',
          navigator.maxTouchPoints || 0,
          screen.colorDepth,
          new Date().getTimezoneOffset(),
        ].join('_');

        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          hash = (hash << 5) - hash + fingerprint.charCodeAt(i);
          hash |= 0;
        }

        deviceId = `device_${Math.abs(hash).toString(16)}_${Date.now().toString(16)}`;
        localStorage.setItem('device_identifier', deviceId);
      }
    } else {
      // 检查设备指纹是否匹配当前设备（增加检测）
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const currentFingerprint = result.visitorId;

        // 从deviceId中提取原始指纹
        const storedParts = deviceId.split('_');

        // 如果存储的指纹与当前不匹配，重新生成
        if (storedParts.length > 1 && !deviceId.includes(currentFingerprint)) {
          // console.log('device feature changed, generating new ID');
          localStorage.removeItem('device_identifier');
          return getDeviceIdentifier(); // 递归调用自身重新生成
        }
      } catch (err) {
        console.error('fingerprint verification failed', err);
      }
    }

    return deviceId;
  };

  const generateImage = async () => {
    if (!uploadedFile) {
      setError('please upload a image file');
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
        setError('image generation failed');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'request error, please try again later';
      setError(`API request error: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImage || downloading) return;

    try {
      setDownloading(true);

      // fetch the image from the server
      const response = await axios.post('/api/download-image', { imageUrl: generatedImage }, { responseType: 'blob' });

      // create a download link
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixel_art.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Download failed:', error);
      // if download failed, open the image in a new tab
      window.open(generatedImage, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto mb-20 max-w-6xl p-4 md:mb-10 lg:p-8">
      {/* Header */}
      <h1 className="mb-4 text-center text-4xl font-bold text-[#B36C31]">Create Your Pixel Art Avatar</h1>
      <p className="mb-8 text-center text-gray-600">
        Upload your photo, adjust size and position to create a personalized pixel art
      </p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left Panel - Editor & Generated Image */}
        <div className="rounded-2xl bg-white p-4 shadow-lg lg:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8D66D]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-black">Pixel Art Editor</h2>
          </div>

          <p className="mb-6 text-gray-600">Upload photo to start</p>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Select Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-lg bg-black px-4 py-2 text-white focus:border-transparent focus:ring-2 focus:ring-[#F8D66D]"
            >
              <option value="minecraft">Minecraft Style</option>
            </select>
          </div>

          {/* Generated Image */}
          {generatedImage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center overflow-hidden rounded-lg border border-gray-200">
                <img src={generatedImage} alt="Generated" className="h-auto w-full max-w-[200px] rounded" />
              </div>
              {/* Download Button */}
              <div className="flex justify-center">
                <button
                  onClick={downloadImage}
                  disabled={downloading}
                  className="w-full rounded-lg bg-[#F8D66D] px-4 py-2 text-black transition-colors hover:bg-[#f4c84d] disabled:bg-gray-200 disabled:text-gray-500"
                >
                  {downloading ? 'Downloading...' : 'Download Image'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Generated image will appear here</p>
            </div>
          )}

          {remainingRequests !== null && (
            <div className="mt-4 text-sm text-gray-600">Remaining requests today: {remainingRequests}</div>
          )}
        </div>

        {/* Right Panel - Upload Area */}
        <div className="relative overflow-hidden rounded-2xl bg-[#5B7A9B] p-4 lg:p-8">
          <div className="flex min-h-[400px] flex-col items-center justify-center text-white">
            <h2 className="mb-4 text-2xl font-semibold">Upload Your Photo</h2>
            <p className="mb-6">Merge your photo with pixel art style</p>

            <button
              onClick={() => document.getElementById('fileInput')?.click()}
              className="mb-6 flex items-center gap-2 rounded-full bg-[#F8D66D] px-6 py-3 text-black transition-colors hover:bg-[#f4c84d]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Choose Photo
            </button>
            <input id="fileInput" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            {originalImage && (
              <div className="mb-6 mt-4 w-full max-w-[200px]">
                <img src={originalImage} alt="Original" className="h-auto w-full rounded-lg" />
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateImage}
              disabled={loading || !uploadedFile}
              className="w-full rounded-lg bg-[#F8D66D] py-3 font-medium text-black transition-colors hover:bg-[#f4c84d] disabled:bg-gray-200 disabled:text-gray-500"
            >
              {loading ? 'Generating...' : 'Generate Pixel Art'}
            </button>

            {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelArtGenerator;
