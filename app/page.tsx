import React, { Suspense } from 'react';
import Loading from '@/components/Loading/Loading';
import PixelArtGenerator from '@/components/PixelArtGenerator';
export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <PixelArtGenerator />
      </main>
    </Suspense>
  );
}
