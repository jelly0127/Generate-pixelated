import React from 'react';
import Image from 'next/image';
const NoFound = () => {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-y-5">
      <Image src="/img/app/logo-nofound.png" alt="" width={60} height={60} className="object-cover" />
      <p className="text-[13.78px] font-medium text-[#B1B1B1]">未发现数据</p>
    </div>
  );
};

export default NoFound;
