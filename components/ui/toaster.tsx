'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      duration={3600}
      toastOptions={{
        classNames: {
          toast:
            'rounded-2xl border border-border bg-white text-foreground shadow-float font-sans',
          title: 'text-sm font-semibold tracking-tight',
          description: 'text-sm text-muted-foreground',
          actionButton: 'bg-zinc-900 text-white',
          cancelButton: 'bg-muted text-foreground',
          closeButton: 'border-border bg-white text-muted-foreground',
        },
      }}
    />
  );
}
