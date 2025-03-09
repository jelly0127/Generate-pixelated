import React, { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { DrawerBackdrop, DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerRoot } from '@chakra-ui/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import classNames from 'classnames';
import useInitStore from '@/store/useInitStore';
import { RiDashboard3Fill } from 'react-icons/ri';
import { FaUserTie } from 'react-icons/fa6';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../ui/menu';
const NavigationBar = () => {
  const { isLogin, initLoading } = useInitStore();
  const [openDrawer, setOpenDrawer] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const renderRouter = () => {
    const routes = [{ path: '/', label: '123' }];

    return (
      <>
        {routes.map((route) => (
          <button
            key={route.path}
            onClick={() => {
              if (route.path !== '/cedefi') return;
              router.push(route.path);
            }}
            className={`col-span-1 flex items-center gap-x-2 text-nowrap border border-transparent border-b-[#FFFFFF1A] pb-2 lg:border-none lg:border-transparent lg:pb-0 ${
              pathname === route.path ? 'text-[#EEEEEE]' : 'text-[#B1B1B1]'
            }`}
          >
            {route.path === pathname && <div className="h-2 w-2 rounded-full bg-[#FCD535]" />}
            <p className="font-medium">{route.label}</p>
          </button>
        ))}
      </>
    );
  };

  const renderLogin = () => {
    return (
      <>
        {/* {initLoading ? (
          <div className="flex animate-pulse items-center bg-[#FFFFFF1A] sm:rounded-full sm:border sm:border-[#FFFFFF1A] sm:px-8 sm:py-5">
            {'   '}
          </div>
        ) : ( */}
        <div className="flex items-center gap-x-5 sm:rounded-full sm:border sm:border-[#FFFFFF1A] sm:px-4 sm:py-2.5">
          <button
            onClick={() => router?.push('/auth/login')}
            className={classNames(
              'rounded-md px-3 py-1 text-[14px] font-medium',

              pathname === '/auth/login' ? 'bg-[#FCD535] text-[#202630]' : 'bg-[#2B3139] text-[#FFFFFF]'
            )}
          >
            登录
          </button>

          <button
            onClick={() => router?.push('/auth/register')}
            className={classNames(
              'hidden rounded-md px-3 py-1 text-[14px] font-medium sm:block',
              pathname === '/auth/register' ? 'bg-[#FCD535] text-[#202630]' : 'bg-[#2B3139] text-[#FFFFFF]'
            )}
          >
            注册
          </button>
        </div>
        {/* )} */}
      </>
    );
  };

  return (
    <Suspense fallback={<></>}>
      <div className="w-full">
        <div className="flex h-16 w-full items-center justify-between px-4 backdrop-blur-md sm:px-5 md:px-6 lg:px-8">
          <Link
            href={'/'}
            className="flex items-center text-nowrap font-title text-[20px] font-bold uppercase leading-5 tracking-wide text-white md:text-[28px]"
          >
            zeroblock capital
          </Link>

          <div className="hidden grid-cols-3 gap-x-10 lg:grid xl:grid-cols-5">
            <div className="col-span-1 hidden xl:block"></div>
            {renderRouter()}
            <div className="col-span-1 hidden xl:block"></div>
          </div>

          <div className="hidden items-center gap-x-2 md:flex">
            <>
              {/* {initLoading ? (
              <div className="flex animate-pulse items-center bg-[#FFFFFF1A] sm:rounded-full sm:border sm:border-[#FFFFFF1A] sm:px-16 sm:py-5">
                {'  '}
              </div>
            ) : ( */}
              <>123</>
              {/* )} */}
            </>

            <div className="flex items-center gap-x-6">
              {!isLogin && renderLogin()}
              {/* <button className="" onClick={() => setOpenDrawer(true)}>
              <Image
                src={'/img/app/logo-more.png'}
                alt="docs"
                width={24}
                height={24}
              />
            </button> */}
            </div>
          </div>

          <div className="flex items-center gap-x-4 md:hidden md:gap-x-6">
            <div className="flex md:hidden">
              <>123</>
            </div>
            <button className="flex md:hidden" onClick={() => setOpenDrawer(true)}>
              <Image src={'/img/app/logo-more.png'} alt="docs" width={24} height={24} />
            </button>
          </div>
        </div>
        <DrawerRoot placement="end" open={openDrawer} onOpenChange={(e) => setOpenDrawer(e.open)}>
          <DrawerBackdrop />
          <DrawerContent className="fixed right-0 h-full w-[300px]">
            <DrawerBody>
              <div className="mt-5 flex flex-col gap-y-5">
                123
                {renderRouter()}
              </div>
            </DrawerBody>
            <DrawerCloseTrigger />
          </DrawerContent>
        </DrawerRoot>
      </div>
    </Suspense>
  );
};

export default NavigationBar;
