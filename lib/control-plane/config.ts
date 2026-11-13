const DEFAULT_CONTROL_PLANE = 'https://flowcomments.com';

export function getControlPlaneUrl(): string | null {
  const raw = process.env.FLOWCOMMENTS_CONTROL_PLANE_URL?.trim();
  if (raw === '' || raw === '0' || raw === 'false') return null;
  if (!raw) return DEFAULT_CONTROL_PLANE;
  return raw.replace(/\/$/, '');
}

export function isControlPlaneEnabled(): boolean {
  return Boolean(getControlPlaneUrl());
}
