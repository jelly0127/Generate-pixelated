import React, { Suspense } from 'react';
import Loading from '@/components/Loading/Loading';
export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <main className="flex min-h-screen w-full">123</main>
    </Suspense>
  );
}
