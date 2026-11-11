import { getControlPlaneUrl } from './config';

export type ControlPlaneAnnouncement = {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  audience: string;
  publishedAt: string;
  expiresAt: string | null;
};

export type AnnouncementsResponse = {
  ok: boolean;
  source?: string;
  checkedAt: string;
  announcements: ControlPlaneAnnouncement[];
  controlPlaneConfigured: boolean;
  error?: string;
};

type CacheEntry = {
  expiresAt: number;
  payload: AnnouncementsResponse;
};

const CACHE_MS = 30 * 60 * 1000;
const globalForCache = globalThis as unknown as {
  __fcAnnouncementsCache?: CacheEntry;
};

export async function fetchControlPlaneAnnouncements(options?: {
  since?: string;
  audience?: 'all' | 'selfhosted' | 'cloud';
  bypassCache?: boolean;
}): Promise<AnnouncementsResponse> {
  const base = getControlPlaneUrl();
  const checkedAt = new Date().toISOString();

  if (!base) {
    return {
      ok: true,
      checkedAt,
      announcements: [],
      controlPlaneConfigured: false,
    };
  }

  const cached = globalForCache.__fcAnnouncementsCache;
  if (!options?.bypassCache && cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  try {
    const url = new URL(`${base}/api/v1/announcements`);
    url.searchParams.set('audience', options?.audience || 'selfhosted');
    if (options?.since) url.searchParams.set('since', options.since);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'flowcomments-selfhost' },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      throw new Error(`Control plane HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      ok?: boolean;
      source?: string;
      checkedAt?: string;
      announcements?: ControlPlaneAnnouncement[];
    };

    const payload: AnnouncementsResponse = {
      ok: Boolean(data.ok ?? true),
      source: data.source,
      checkedAt: data.checkedAt || checkedAt,
      announcements: data.announcements || [],
      controlPlaneConfigured: true,
    };

    globalForCache.__fcAnnouncementsCache = {
      expiresAt: Date.now() + CACHE_MS,
      payload,
    };

    return payload;
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      announcements: [],
      controlPlaneConfigured: true,
      error: error instanceof Error ? error.message : 'Falha ao buscar comunicados',
    };
  }
}
