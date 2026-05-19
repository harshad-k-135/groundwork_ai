import { motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  Circle,
  Database,
  Globe,
  Loader2,
  Network,
  Sparkles,
} from "lucide-react";
import { WORKFLOW_STEPS } from "../../lib/constants";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

const STEP_ICONS = {
  decompose: Network,
  arxiv: Database,
  semantic: Brain,
  web: Globe,
  synthesize: Sparkles,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const stepItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0 },
};

export function LoadingWorkflow({ topic, statusIndex, progressPercent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12"
    >
      <div className="rounded-2xl border border-glass-border bg-glass/40 p-8 shadow-glass backdrop-blur-2xl">
        <motion.div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15"
            >
              <Loader2 className="h-6 w-6 text-accent" />
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Synthesizing intelligence</h2>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {topic}
              </p>
            </div>
          </div>
          <div className="text-right">
            <motion.p
              key={progressPercent}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-4xl font-bold text-accent"
            >
              {progressPercent}%
            </motion.p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Complete
            </p>
          </div>
        </motion.div>

        <motion.div className="mb-8 h-1.5 overflow-hidden rounded-full bg-secondary/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        <motion.ul variants={container} initial="hidden" animate="show" className="space-y-3">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = STEP_ICONS[step.icon] || Circle;
            const isDone = statusIndex > step.threshold;
            const isActive = statusIndex === step.threshold;

            return (
              <motion.li
                key={step.id}
                variants={stepItem}
                className={cn(
                  "flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-300",
                  isActive && "border-accent/40 bg-accent/5 shadow-glow",
                  isDone && "border-glass-border bg-secondary/30 opacity-70",
                  !isActive && !isDone && "border-transparent bg-transparent opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isActive && "bg-accent/20",
                    isDone && "bg-accent/10",
                    !isActive && !isDone && "bg-secondary/40"
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : isActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Icon className="h-4 w-4 text-accent" />
                    </motion.div>
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wider",
                    isDone && "text-accent",
                    isActive && "text-accent animate-pulse",
                    !isActive && !isDone && "text-muted-foreground/50"
                  )}
                >
                  {isDone ? "Done" : isActive ? "Running" : "Pending"}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>

      <ReportSkeleton />
    </motion.div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-glass-border/50 bg-glass/20 p-6 backdrop-blur-xl">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="mt-6 grid gap-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
