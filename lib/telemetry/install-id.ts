import { getSystemConfig, setSystemConfig } from '@/lib/system-config';

const INSTALL_ID_KEY = 'install_id';

export async function getOrCreateInstallId(): Promise<string> {
  const existing = await getSystemConfig(INSTALL_ID_KEY);
  if (existing && existing.length >= 16) return existing;

  const installId = `fc_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
  await setSystemConfig(INSTALL_ID_KEY, installId);
  return installId;
}
