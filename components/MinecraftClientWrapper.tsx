'use client';
import dynamic from 'next/dynamic';

// 在客户端组件中使用动态导入
const Minecraft3DConverterWithNoSSR = dynamic(() => import('@/components/Minecraft3DConverter'), { ssr: false });

export default function MinecraftClientWrapper() {
  return <Minecraft3DConverterWithNoSSR />;
}
