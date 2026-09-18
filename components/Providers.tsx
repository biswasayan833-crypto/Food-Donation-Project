'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from './Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
