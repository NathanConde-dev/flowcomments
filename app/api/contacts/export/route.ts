import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  try {
    const session = await requireAuth();

    const contacts = await prisma.contact.findMany({
      where: { userId: session.userId },
      include: {
        igAccount: { select: { igUsername: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const customKeys = new Set<string>();
    const rows = contacts.map((contact) => {
      let tags: string[] = [];
      let customData: Record<string, unknown> = {};
      try {
        tags = contact.tags ? (JSON.parse(contact.tags) as string[]) : [];
      } catch {
        tags = [];
      }
      try {
        customData = contact.customData
          ? (JSON.parse(contact.customData) as Record<string, unknown>)
          : {};
      } catch {
        customData = {};
      }
      for (const key of Object.keys(customData)) {
        if (!key.startsWith('_')) customKeys.add(key);
      }
      return { contact, tags, customData };
    });

    const extraKeys = [...customKeys].sort();
    const headers = [
      'username',
      'full_name',
      'ig_user_id',
      'account',
      'source_automation',
      'last_automation',
      'tags',
      'last_seen_at',
      'created_at',
      ...extraKeys,
    ];

    const lines = [
      headers.join(','),
      ...rows.map(({ contact, tags, customData }) =>
        [
          contact.igUsername,
          contact.fullName || '',
          contact.igUserId,
          contact.igAccount.igUsername,
          contact.sourceAutomationName || '',
          contact.lastAutomationName || '',
          tags.join('|'),
          contact.lastSeenAt?.toISOString() || '',
          contact.createdAt.toISOString(),
          ...extraKeys.map((key) => customData[key] ?? ''),
        ]
          .map(csvEscape)
          .join(',')
      ),
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contatos-flowcomments-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json({ error: 'Erro ao exportar contatos' }, { status: 500 });
  }
}
