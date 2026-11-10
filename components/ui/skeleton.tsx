import { cn } from '@/lib/utils/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-black/[0.06] [animation-duration:1.4s]',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
