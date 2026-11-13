import { getControlPlaneUrl } from '@/lib/control-plane/config';

const DEFAULT_CONTROL_PLANE = 'https://flowcomments.com';

/** Anonymous install metrics are on by default. Opt out with FLOWCOMMENTS_TELEMETRY=false. */
export function isTelemetryEnabled(): boolean {
  const flag = process.env.FLOWCOMMENTS_TELEMETRY?.trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off' || flag === 'no') {
    return false;
  }
  return true;
}

export function getTelemetryBaseUrl(): string {
  return getControlPlaneUrl() || DEFAULT_CONTROL_PLANE;
}

export function getHeartbeatUrl(): string {
  return `${getTelemetryBaseUrl()}/api/v1/installs/heartbeat`;
}
