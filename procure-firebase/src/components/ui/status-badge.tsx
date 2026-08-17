import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        draft: "bg-muted text-muted-foreground",
        active: "bg-status-active/20 text-status-active-foreground",
        awarded: "bg-status-awarded text-status-awarded-foreground",
        closed: "bg-status-closed/20 text-status-closed",
        submitted: "bg-primary/10 text-primary",
        "under-review": "bg-status-active/20 text-status-active-foreground",
        shortlisted: "bg-status-awarded/20 text-status-awarded",
        rejected: "bg-status-closed/20 text-status-closed",
        winner: "bg-status-awarded text-status-awarded-foreground",
        upcoming: "bg-muted text-muted-foreground",
        completed: "bg-status-awarded/20 text-status-awarded",
      },
    },
    defaultVariants: {
      status: "draft",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  className?: string;
  children: React.ReactNode;
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {children}
    </span>
  );
}
