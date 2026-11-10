import { randomBytes } from 'crypto';

/**
 * Encryption keys must come from the environment in production.
 * Persisting the key in the same DB as the ciphertext defeats encryption-at-rest.
 */
export function requireEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY_RUNTIME;

  if (key && key.length >= 32) {
    return key;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY must be set in production (min 32 chars). Do not store encryption keys in the database.'
    );
  }

  // Dev-only ephemeral key so local boot works without env.
  // Sessions/tokens encrypted with this key are lost on restart.
  if (!process.env.ENCRYPTION_KEY_RUNTIME) {
    process.env.ENCRYPTION_KEY_RUNTIME = randomBytes(32).toString('hex');
    console.warn(
      '[security] ENCRYPTION_KEY missing; using ephemeral runtime key (dev only). Set ENCRYPTION_KEY for stable encryption.'
    );
  }

  return process.env.ENCRYPTION_KEY_RUNTIME!;
}

/** @deprecated Use requireEncryptionKey; keys must not be persisted in SystemConfig. */
export async function ensureEncryptionKey(): Promise<string> {
  return requireEncryptionKey();
}
