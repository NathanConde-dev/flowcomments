'use client';

import { useEffect, useState } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

export function Toaster() {
  const isMobile = useIsMobileViewport();

  return (
    <SonnerToaster
      // Desktop: canto inferior direito. Mobile: topo (evita a bottom nav).
      position={isMobile ? 'top-center' : 'bottom-right'}
      richColors
      closeButton
      duration={3600}
      offset={isMobile ? 16 : 24}
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
