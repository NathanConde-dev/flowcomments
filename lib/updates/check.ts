import { readLocalChangelog, type ChangelogEntry } from './changelog';
import {
  getLocalVersion,
  getUpdateRepo,
  isNewerVersion,
  isSelfUpdateEnabled,
  normalizeVersion,
} from './version';

export type RemoteRelease = {
  version: string;
  name: string;
  htmlUrl: string;
  publishedAt: string | null;
  body: string;
};

export type UpdateCheckResult = {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  selfUpdateEnabled: boolean;
  repo: string;
  checkedAt: string;
  remoteAvailable: boolean;
  releases: Array<{
    version: string;
    date: string | null;
    title: string;
    htmlUrl: string | null;
    sections: Record<string, string[]>;
    body: string;
  }>;
  installHints: {
    docker: string;
    git: string;
    railway: string;
  };
};

type CacheEntry = {
  expiresAt: number;
  releases: RemoteRelease[];
};

const CACHE_MS = 6 * 60 * 60 * 1000;
const globalForCache = globalThis as unknown as {
  __fcUpdateCache?: CacheEntry;
};

async function fetchGithubReleases(repo: string): Promise<RemoteRelease[]> {
  const cached = globalForCache.__fcUpdateCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.releases;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'flowcomments-update-check',
    },
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

  const releases = data
    .filter((item) => !item.draft && !item.prerelease && item.tag_name)
    .map((item) => ({
      version: normalizeVersion(item.tag_name || ''),
      name: item.name || item.tag_name || '',
      htmlUrl: item.html_url || `https://github.com/${repo}/releases`,
      publishedAt: item.published_at || null,
      body: item.body || '',
    }))
    .filter((item) => Boolean(item.version));

  globalForCache.__fcUpdateCache = {
    expiresAt: Date.now() + CACHE_MS,
    releases,
  };

  return releases;
}

function mergeReleases(
  changelog: ChangelogEntry[],
  remote: RemoteRelease[],
  repo: string
) {
  const byVersion = new Map<
    string,
    {
      version: string;
      date: string | null;
      title: string;
      htmlUrl: string | null;
      sections: Record<string, string[]>;
      body: string;
    }
  >();

  for (const entry of changelog) {
    byVersion.set(entry.version, {
      version: entry.version,
      date: entry.date,
      title: `v${entry.version}`,
      htmlUrl: `https://github.com/${repo}/releases/tag/v${entry.version}`,
      sections: entry.sections,
      body: entry.body,
    });
  }

  for (const release of remote) {
    const existing = byVersion.get(release.version);
    byVersion.set(release.version, {
      version: release.version,
      date: release.publishedAt?.slice(0, 10) || existing?.date || null,
      title: release.name || `v${release.version}`,
      htmlUrl: release.htmlUrl,
      sections: existing?.sections || {},
      body: release.body || existing?.body || '',
    });
  }

  return Array.from(byVersion.values()).sort((a, b) => {
    if (isNewerVersion(a.version, b.version)) return -1;
    if (isNewerVersion(b.version, a.version)) return 1;
    return 0;
  });
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const current = getLocalVersion();
  const repo = getUpdateRepo();
  const changelog = await readLocalChangelog();

  let remote: RemoteRelease[] = [];
  let remoteAvailable = true;

  try {
    remote = await fetchGithubReleases(repo);
  } catch {
    remoteAvailable = false;
  }

  const releases = mergeReleases(changelog, remote, repo);
  const latest = remote[0]?.version || releases[0]?.version || null;
  const updateAvailable = latest ? isNewerVersion(latest, current) : false;

  return {
    current,
    latest,
    updateAvailable,
    selfUpdateEnabled: isSelfUpdateEnabled(),
    repo,
    checkedAt: new Date().toISOString(),
    remoteAvailable,
    releases,
    installHints: {
      docker: [
        'cd /caminho/do/flowcomments',
        'docker compose pull',
        'docker compose up -d --build',
        '# migrate roda no start.sh automaticamente',
      ].join('\n'),
      git: [
        'cd /caminho/do/flowcomments',
        'git fetch --tags origin',
        'git checkout "v$(curl -fsSL https://api.github.com/repos/' +
          repo +
          '/releases/latest | sed -n \'s/.*"tag_name": "\\([^"]*\\)".*/\\1/p\')"',
        'npm ci',
        'npx prisma migrate deploy',
        'npm run build',
        'pm2 restart flowcomments flowcomments-worker',
      ].join('\n'),
      railway: [
        'No Railway: redeploy a partir do GitHub (New Deploy)',
        'ou conecte a branch main e use Deploy após o release.',
        'Migrations rodam no start.sh no boot.',
      ].join('\n'),
    },
  };
}
