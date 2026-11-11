import { readFile } from 'fs/promises';
import path from 'path';
import { normalizeVersion } from './version';

export type ChangelogEntry = {
  version: string;
  date: string | null;
  sections: Record<string, string[]>;
  body: string;
};

function parseEntryBlock(headingLine: string, body: string): ChangelogEntry | null {
  const heading = headingLine.match(/^##\s+\[([^\]]+)\](?:\s+-\s+(.+))?/);
  if (!heading) return null;

  const version = normalizeVersion(heading[1]);
  const date = heading[2]?.trim() || null;
  const sections: Record<string, string[]> = {};
  let currentSection = 'Notes';

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trimEnd();
    const sectionMatch = line.match(/^###\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }

    const itemMatch = line.match(/^[-*]\s+(.+)/);
    if (itemMatch) {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(itemMatch[1].trim());
    }
  }

  return {
    version,
    date,
    sections,
    body: body.trim(),
  };
}

export function parseChangelog(markdown: string): ChangelogEntry[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const entries: ChangelogEntry[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentHeading) return;
    const entry = parseEntryBlock(currentHeading, buffer.join('\n'));
    if (entry) entries.push(entry);
    buffer = [];
  };

  for (const line of lines) {
    if (line.startsWith('## [')) {
      flush();
      currentHeading = line;
      continue;
    }
    if (currentHeading) buffer.push(line);
  }
  flush();

  return entries;
}

export async function readLocalChangelog(): Promise<ChangelogEntry[]> {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  try {
    const markdown = await readFile(filePath, 'utf8');
    return parseChangelog(markdown);
  } catch {
    return [];
  }
}
