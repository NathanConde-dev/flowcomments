'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function SessionKeepalive() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let lastPing = Date.now();

    const ping = async () => {
      try {
        const response = await fetch('/api/auth/ping', {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (response.status === 401) {
          // Session expired - redirect to login
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        console.error('Session ping failed:', error);
      }
      lastPing = Date.now();
    };

    // Ping on mount if last ping was >5 min ago
    if (Date.now() - lastPing > PING_INTERVAL) {
      ping();
    }

    // Set up interval for background pinging
    intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        ping();
      }
    }, PING_INTERVAL);

    // Ping on visibility change (tab becomes active)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPing > PING_INTERVAL) {
        ping();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Ping on navigation
    const handleRouteChange = () => {
      if (Date.now() - lastPing > PING_INTERVAL) {
        ping();
      }
    };

    // Listen to pathname changes
    handleRouteChange();

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, router]);

  return null;
}
