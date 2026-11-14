import { readLocalChangelog, type ChangelogEntry } from './changelog';
import { fetchRemoteReleases, type RemoteRelease } from './remote';
import {
  getLocalVersion,
  getUpdateRepo,
  isNewerVersion,
  isSelfUpdateEnabled,
} from './version';

export type { RemoteRelease };

export type UpdateCheckResult = {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  selfUpdateEnabled: boolean;
  repo: string;
  checkedAt: string;
  remoteAvailable: boolean;
  remoteSource: 'github' | 'control_plane' | null;
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

  const remoteResult = await fetchRemoteReleases(repo);
  const remote = remoteResult.releases;

  const releases = mergeReleases(changelog, remote, repo);
  // Prefer remote latest; if remote failed, changelog alone still drives "update available"
  const latest = remote[0]?.version || releases[0]?.version || null;
  const updateAvailable = latest ? isNewerVersion(latest, current) : false;

  return {
    current,
    latest,
    updateAvailable,
    selfUpdateEnabled: isSelfUpdateEnabled(),
    repo,
    checkedAt: new Date().toISOString(),
    remoteAvailable: remoteResult.remoteAvailable,
    remoteSource: remoteResult.source,
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
