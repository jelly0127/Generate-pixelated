import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    nickname?: string;
    provider?: string;
  }

  interface Session {
    user: User & {
      role?: string;
      nickname?: string;
      provider?: string;
    };
  }

  interface JWT {
    role?: string;
    nickname?: string;
    provider?: string;
  }
}
