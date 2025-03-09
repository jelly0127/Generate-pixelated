import type { Metadata } from 'next';
import './globals.css';
import React from 'react';
import Dom from '../contant/Dom';
const URL = process.env.NEXTAUTH_URL;

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: '',
  description: '',
  keywords: '',
  robots: 'index,follow',
  openGraph: {
    type: 'website',
    title: '',
    description: '',
    url: URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: '',
    description: '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body>
        <Dom>{children}</Dom>
      </body>
    </html>
  );
}
