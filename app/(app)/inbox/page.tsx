import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { InboxShell } from '@/components/inbox/InboxShell';
import { InboxPageSkeleton } from '@/components/ui/skeletons';

export const dynamic = 'force-dynamic';

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>;
}) {
  const session = await readSession();
  if (!session.isLoggedIn) redirect('/login');

  const params = (await searchParams) || {};

  return (
    <div className="h-full min-h-0">
      <Suspense fallback={<InboxPageSkeleton />}>
        <InboxShell initialConversationId={params.c || null} />
      </Suspense>
    </div>
  );
}
