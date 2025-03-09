import localFont from 'next/font/local';

export const customFont = localFont({
  src: '../public/font/bd.ttf',
  variable: '--font-bd',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

export const anotherFont = localFont({
  src: '../public/font/title.otf',
  variable: '--font-title',
});
