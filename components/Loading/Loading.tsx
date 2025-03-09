import React from 'react';

const Loading = () => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#202020]">
      {/* 标题 */}
      <h1 className="mb-8 animate-pulse text-[28px] font-bold tracking-wider text-white"></h1>

      {/* 加载动画 */}
      <div className="flex space-x-2">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="h-4 w-4 animate-bounce rounded-full bg-blue-500"
            style={{
              animationDelay: `${index * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* 环形动画 */}
      <div className="relative mt-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <div className="absolute top-0 h-16 w-16 animate-ping rounded-full border-4 border-purple-500 opacity-20" />
      </div>
    </div>
  );
};

export default Loading;
