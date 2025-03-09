import { UserInfoType } from '@/types/type';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface InitData {
  serverTimer: Date;
  setServerTime: (serverTime: Date) => void;

  userInfo: UserInfoType;
  updatedUserInfo: (newUserInfo: Partial<UserInfoType>) => void;

  initLoading: boolean;
  updateInitLoading: (initLoading: boolean) => void;

  isLogin: boolean;
  updateLogin: (isLogin: boolean) => void;
}

// Create the store using Zustand with devtools middleware
const useInitStore = create<InitData>()(
  devtools(
    (set) => ({
      serverTimer: 0,
      setServerTime: (serverTime: Date) =>
        set((state) => ({
          serverTimer: serverTime,
        })),

      isLogin: false,
      updateLogin: (display) =>
        set((state) => ({
          isLogin: display,
        })),
      initLoading: true,
      updateInitLoading: (display) =>
        set((state) => ({
          initLoading: display,
        })),
    }),
    {
      name: 'initStore',
    }
  )
);

export default useInitStore;
