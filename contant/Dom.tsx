'use client';
import { Provider as ThemeProvider } from '../components/ui/provider';
import { Toaster } from '../components/ui/toaster';
import React from 'react';
import { anotherFont, customFont } from '../app/font';

const DomContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={`${customFont.variable} ${anotherFont.variable}`}>
      <ThemeProvider>
        <Toaster />
        {children}
      </ThemeProvider>
    </div>
  );
};

const Dom = ({ children }: { children: React.ReactNode }) => {
  return <DomContent>{children}</DomContent>;
};

export default Dom;
