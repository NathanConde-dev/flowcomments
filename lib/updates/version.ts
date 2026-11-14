export type SemVer = {
  major: number;
  minor: number;
  patch: number;
  raw: string;
};

export function normalizeVersion(input: string): string {
  return input.trim().replace(/^v/i, '');
}

export function parseSemVer(input: string): SemVer | null {
  const raw = normalizeVersion(input);
  const match = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw,
  };
}

export function compareSemVer(a: string, b: string): number {
  const left = parseSemVer(a);
  const right = parseSemVer(b);
  if (!left || !right) return 0;

  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareSemVer(latest, current) > 0;
}

export function getLocalVersion(): string {
  // Runtime override for installs that want to pin/report a version
  // (also useful to simulate “update available” locally).
  const override = process.env.FLOWCOMMENTS_LOCAL_VERSION?.trim();
  if (override) return normalizeVersion(override);

  return (
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.npm_package_version ||
    '0.1.0'
  );
}

export function getUpdateRepo(): string {
  return process.env.FLOWCOMMENTS_UPDATE_REPO || 'NathanConde-dev/flowcomments';
}

export function isSelfUpdateEnabled(): boolean {
  return process.env.ENABLE_SELF_UPDATE === 'true';
}

export function getGithubToken(): string | null {
  const token =
    process.env.FLOWCOMMENTS_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    null;
  return token || null;
}
