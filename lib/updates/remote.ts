import { getControlPlaneUrl } from '@/lib/control-plane/config';
import { getGithubToken, normalizeVersion } from './version';

export type RemoteRelease = {
  version: string;
  name: string;
  htmlUrl: string;
  publishedAt: string | null;
  body: string;
};

type CacheEntry = {
  expiresAt: number;
  releases: RemoteRelease[];
  source: 'github' | 'control_plane';
};

const CACHE_MS = 6 * 60 * 60 * 1000;
const globalForCache = globalThis as unknown as {
  __fcUpdateCache?: CacheEntry;
};

export async function fetchGithubReleases(repo: string): Promise<RemoteRelease[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'flowcomments-update-check',
  };
  const token = getGithubToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, {
    headers,
    next: { revalidate: 21600 },
  });

  if (!res.ok) {
    throw new Error(`GitHub releases HTTP ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    tag_name?: string;
    name?: string;
    html_url?: string;
    published_at?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
  }>;

  return data
    .filter((item) => !item.draft && !item.prerelease && item.tag_name)
    .map((item) => ({
      version: normalizeVersion(item.tag_name || ''),
      name: item.name || item.tag_name || '',
      htmlUrl: item.html_url || `https://github.com/${repo}/releases`,
      publishedAt: item.published_at || null,
      body: item.body || '',
    }))
    .filter((item) => Boolean(item.version));
}

export async function fetchControlPlaneReleases(): Promise<RemoteRelease[]> {
  const base = getControlPlaneUrl();
  if (!base) {
    throw new Error('control_plane_disabled');
  }

  const res = await fetch(`${base}/api/v1/releases`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'flowcomments-update-check',
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Control plane releases HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    releases?: Array<{
      version?: string;
      name?: string;
      htmlUrl?: string;
      publishedAt?: string | null;
      body?: string;
    }>;
  };

  return (data.releases || [])
    .map((item) => ({
      version: normalizeVersion(item.version || ''),
      name: item.name || item.version || '',
      htmlUrl: item.htmlUrl || base,
      publishedAt: item.publishedAt || null,
      body: item.body || '',
    }))
    .filter((item) => Boolean(item.version));
}

/**
 * Prefer GitHub when reachable; fall back to Flowcomments Cloud control plane
 * (needed when the core repo is private / rate-limited).
 */
export async function fetchRemoteReleases(repo: string): Promise<{
  releases: RemoteRelease[];
  source: 'github' | 'control_plane' | null;
  remoteAvailable: boolean;
}> {
  const cached = globalForCache.__fcUpdateCache;
  if (cached && cached.expiresAt > Date.now()) {
    return {
      releases: cached.releases,
      source: cached.source,
      remoteAvailable: true,
    };
  }

  try {
    const releases = await fetchGithubReleases(repo);
    if (releases.length > 0) {
      globalForCache.__fcUpdateCache = {
        expiresAt: Date.now() + CACHE_MS,
        releases,
        source: 'github',
      };
      return { releases, source: 'github', remoteAvailable: true };
    }
  } catch {
    // fall through to control plane
  }

  try {
    const releases = await fetchControlPlaneReleases();
    if (releases.length > 0) {
      globalForCache.__fcUpdateCache = {
        expiresAt: Date.now() + CACHE_MS,
        releases,
        source: 'control_plane',
      };
      return { releases, source: 'control_plane', remoteAvailable: true };
    }
  } catch {
    // both failed
  }

  return { releases: [], source: null, remoteAvailable: false };
}
