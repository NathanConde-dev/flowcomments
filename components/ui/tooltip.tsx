'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils/cn';

const TooltipProvider = ({
  delayDuration = 250,
  skipDelayDuration = 150,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  />
);
TooltipProvider.displayName = TooltipPrimitive.Provider.displayName;

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[100] max-w-xs origin-[var(--radix-tooltip-content-transform-origin)] rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-float',
        'border border-white/10 fc-tooltip-in',
        'data-[state=closed]:opacity-0 data-[state=closed]:scale-95',
        className
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-zinc-900" width={10} height={5} />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Convenience wrapper: hover/focus shows a styled tooltip. */
function WithTooltip({
  label,
  children,
  side = 'top',
  align = 'center',
  delayDuration,
  disabled,
  className,
  asChild = true,
}: {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
}) {
  if (!label || disabled) return children;

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  WithTooltip,
};
