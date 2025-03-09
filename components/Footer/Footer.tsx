import React from 'react';
import Image from 'next/image';
const Footer = () => {
  return (
    <div className="flex w-full items-center justify-between px-10">
      <div className="w-1/3 opacity-0">{'1'}</div>
      <div className="flex w-1/3 items-center justify-center text-nowrap text-center leading-5 text-[#B7BDC6]">
        © 2025
      </div>
      <div className="flex w-1/3 items-center justify-end gap-x-4">
        <button>
          <Image src={'/img/launch/nav-docs.png'} alt="docs" width={32} height={32} className={'h-auto w-auto'} />
        </button>
        <button>
          <Image src={'/img/launch/nav-wechat.png'} alt="docs" width={24} height={24} className={'h-auto w-auto'} />
        </button>
      </div>
    </div>
  );
};

export default Footer;
