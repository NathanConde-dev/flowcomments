'use client';

import { useEffect } from 'react';

/** Triggers a throttled server-side heartbeat while the app shell is mounted. */
export function TelemetryPing() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetch('/api/telemetry/ping', { method: 'POST', cache: 'no-store' }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
