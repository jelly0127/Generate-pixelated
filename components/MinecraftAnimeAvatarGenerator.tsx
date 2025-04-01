'use client';
import React, { useState, useRef } from 'react';
import axios from 'axios';

const MinecraftAnimeAvatarGenerator = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setOriginalImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateImage = async () => {
    if (!uploadedFile) {
      setError('请先上传头像图片');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 创建FormData对象直接发送文件
      const formData = new FormData();
      formData.append('image', uploadedFile);
      formData.append('style', 'minecraft');

      const response = await axios.post('/api/transform-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.imageUrl) {
        setGeneratedImage(response.data.imageUrl);
      } else {
        setError('转换图像失败');
      }
    } catch (err) {
      setError('API请求错误，请稍后再试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'minecraft_avatar.png';
    link.click();
  };

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">我的世界像素头像生成器</h1>

      <div className="w-full">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="w-full p-2 border rounded-md"
        />
      </div>

      <button
        onClick={generateImage}
        disabled={loading || !uploadedFile}
        className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? '生成中...' : '生成我的世界风格头像'}
      </button>

      {error && <div className="text-red-500">{error}</div>}

      {/* 两张图片并排显示，限制尺寸为200px */}
      <div className="w-full flex flex-row gap-8 justify-center">
        {originalImage && (
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-medium mb-2">原始头像</h2>
            <div className="border rounded-lg overflow-hidden" style={{ width: '200px', height: '200px' }}>
              <img
                src={originalImage}
                alt="原始头像"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {generatedImage && (
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-medium mb-2">我的世界风格头像</h2>
            <div className="border rounded-lg overflow-hidden" style={{ width: '200px', height: '200px' }}>
              <img
                src={generatedImage}
                alt="生成的我的世界风格头像"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* 下载按钮 */}
      {generatedImage && (
        <button
          onClick={downloadImage}
          className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          下载我的世界风格头像
        </button>
      )}
    </div>
  );
};

export default MinecraftAnimeAvatarGenerator; 