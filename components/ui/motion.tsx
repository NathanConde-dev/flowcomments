import { cn } from '@/lib/utils/cn';

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('fc-animate-in', className)}>{children}</div>;
}

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('fc-stagger', className)}>{children}</div>;
}

export function FadeIn({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  return (
    <div
      className={cn('fc-animate-in', className)}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
