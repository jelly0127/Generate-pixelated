import React, { Suspense } from 'react';
import Loading from '@/components/Loading/Loading';
import MinecraftClientWrapper from '@/components/MinecraftClientWrapper';
import PixelConverter from '@/components/PixelConverter';
import GhibliStyleConverter from '@/components/GhibliStyleConverter';
import MinecraftAnimeAvatarGenerator from '@/components/MinecraftAnimeAvatarGenerator';
export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        {/* <PixelConverter /> */}
        {/* <GhibliStyleConverter /> */}
        <MinecraftAnimeAvatarGenerator />
      </main>
    </Suspense>
  );
}
