import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {}
export const config = {
  matcher: ['/admin/:path*', '/((?!api|_next/static|favicon.ico).*)'],
};
