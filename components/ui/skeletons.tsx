import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mb-8 space-y-3', className)}>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-white p-5 shadow-soft"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28" />
              <div className="flex flex-wrap gap-2 pt-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function FormCardSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

export function AccountRowSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <PageHeaderSkeleton />
      <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-56" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-5 shadow-soft space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AutomationsPageSkeleton() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeaderSkeleton className="mb-0" />
        <Skeleton className="h-10 w-40" />
      </div>
      <CardListSkeleton rows={3} />
    </div>
  );
}

export function InboxPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <div className="flex h-full w-full flex-col border-r border-border bg-white md:w-[340px] lg:w-[380px]">
        <div className="space-y-3 border-b border-border p-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-3 bg-muted/20 p-4">
          <Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" />
          <Skeleton className="h-12 w-1/2 rounded-2xl" />
          <Skeleton className="ml-auto h-20 w-3/5 rounded-2xl" />
        </div>
        <div className="border-t border-border bg-white p-3 space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="ml-auto h-10 w-48" />
        </div>
      </div>
    </div>
  );
}

export function ContactsPageSkeleton() {
  return (
    <div className="p-6 md:p-8">
      <PageHeaderSkeleton />
      <TableRowsSkeleton rows={6} />
    </div>
  );
}

export function SettingsFormSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <FormCardSkeleton fields={6} />
      <FormCardSkeleton fields={2} />
    </div>
  );
}

export function SettingsContentSkeleton() {
  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <AccountRowSkeleton rows={2} />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function ChooseAccountSkeleton() {
  return (
    <div className="min-h-[60vh] p-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-white p-6 shadow-soft space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <AccountRowSkeleton rows={3} />
      </div>
    </div>
  );
}

export function AutomationBuilderSkeleton() {
  return (
    <div className="flex h-full min-h-[calc(100vh-0px)] flex-col bg-canvas">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="fc-canvas-dot flex flex-1 flex-col items-center gap-2 py-10 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-2xl border border-border bg-white p-4 shadow-soft">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>
              {i < 3 && <Skeleton className="my-2 h-10 w-px" />}
            </div>
          ))}
        </div>
        <div className="w-full border-t border-border bg-white p-5 lg:w-[360px] lg:border-l lg:border-t-0 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export function WhatsNewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-4 w-60 max-w-full" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52 max-w-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnnouncementsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="rounded-xl border border-border bg-white p-6 shadow-soft space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
