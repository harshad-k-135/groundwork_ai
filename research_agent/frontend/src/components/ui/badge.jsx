import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-accent/30 bg-accent/10 text-accent",
        secondary: "border-border bg-secondary/60 text-muted-foreground",
        outline: "border-glass-border text-muted-foreground",
        foundational: "border-accent/50 bg-accent/20 text-accent",
        recent: "border-blue-400/30 bg-blue-400/10 text-blue-300",
        tangential: "border-border bg-muted/30 text-muted-foreground",
        source: "border-glass-border bg-glass/40 font-mono text-[9px] text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
