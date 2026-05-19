import { motion } from "framer-motion";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

export function SearchBar({
  topic,
  onTopicChange,
  maxResults,
  onMaxResultsChange,
  onSubmit,
  disabled = false,
  loading = false,
  compact = false,
  className,
}) {
  return (
    <motion.div
      layout
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-2xl border border-glass-border bg-glass/40 p-2 shadow-glass backdrop-blur-2xl transition-all duration-300",
        "focus-within:border-accent/40 focus-within:shadow-glow",
        disabled && "pointer-events-none opacity-40",
        compact ? "max-w-3xl" : "max-w-3xl",
        className
      )}
    >
      <motion.div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10"
        whileHover={{ scale: 1.05 }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : (
          <Search className="h-4 w-4 text-accent" />
        )}
      </motion.div>

      <Input
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Research any topic — transformers, CRISPR, quantum error correction..."
        className="h-10 flex-1 border-0 bg-transparent text-[15px]"
        disabled={disabled || loading}
      />

      <motion.div className="hidden h-8 w-px bg-glass-border sm:block" />

      <div className="hidden items-center gap-2 px-2 sm:flex">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Papers
        </span>
        <input
          type="number"
          min={1}
          max={20}
          value={maxResults || ""}
          onChange={(e) => onMaxResultsChange(Number(e.target.value))}
          disabled={disabled || loading}
          className="w-10 rounded-md bg-secondary/50 py-1 text-center font-mono text-sm text-foreground outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      <Button
        onClick={onSubmit}
        disabled={!topic.trim() || disabled || loading}
        size={compact ? "sm" : "default"}
        className="shrink-0 gap-2 rounded-xl"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Analyzing" : "Research"}
      </Button>
    </motion.div>
  );
}
