export function getControlPlaneUrl(): string | null {
  const raw = process.env.FLOWCOMMENTS_CONTROL_PLANE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function isControlPlaneEnabled(): boolean {
  return Boolean(getControlPlaneUrl());
}
