import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-blue-200 bg-blue-50 text-blue-700',
        secondary: 'border-slate-200 bg-slate-100 text-slate-700',
        destructive: 'border-rose-200 bg-rose-50 text-rose-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        cyan: 'border-sky-200 bg-sky-50 text-sky-700',
        mono: 'border-slate-200 bg-slate-50 font-mono text-[10px] tracking-wider uppercase text-slate-600',
        outline: 'border-slate-200 text-slate-700 bg-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
