import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const sidebarVariants = {
  expanded: { width: 280 },
  collapsed: { width: 72 },
};

export function Sidebar({
  open,
  onToggle,
  historyItems,
  activeTopic,
  uiState,
  onSelectTopic,
  onClearHistory,
}) {
  return (
    <motion.aside
      initial={false}
      animate={open ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed left-4 top-4 bottom-4 z-50 flex flex-col overflow-hidden",
        "rounded-2xl border border-glass-border bg-glass/50 shadow-glass backdrop-blur-2xl"
      )}
    >
      <motion.div
        className="flex h-14 shrink-0 items-center gap-3 border-b border-glass-border px-4"
        layout
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="min-w-0 flex-1"
            >
              <p className="truncate font-display text-sm font-bold tracking-tight text-foreground">
                Groundwork
              </p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                Research Intelligence
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto shrink-0"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </Button>
      </motion.div>

      <div className="flex flex-1 flex-col overflow-hidden p-3">
        <AnimatePresence>
          {open && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Recent explorations
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
          {historyItems.length === 0 ? (
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 px-2 py-8 text-center"
                >
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No explorations yet</p>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            historyItems.map((item, idx) => {
              const isActive = activeTopic === item.topic && uiState !== "idle";
              return (
                <motion.button
                  key={`${item.topic}-${item.timestamp}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => onSelectTopic(item.topic)}
                  className={cn(
                    "group relative flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-200",
                    isActive
                      ? "border border-accent/30 bg-accent/10"
                      : "border border-transparent hover:bg-secondary/50"
                  )}
                  title={item.topic}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isActive ? "bg-accent/20" : "bg-secondary/60"
                    )}
                  >
                    <FileText
                      className={cn("h-3.5 w-3.5", isActive ? "text-accent" : "text-muted-foreground")}
                    />
                  </div>
                  {open && (
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium leading-tight",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {item.topic}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(item.timestamp)}</span>
                        <span className="text-accent/80">· {item.total_found} papers</span>
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })
          )}
        </motion.div>
      </div>

      <div className="shrink-0 space-y-1 border-t border-glass-border p-3">
        <Button
          variant="ghost"
          size={open ? "default" : "icon"}
          onClick={onClearHistory}
          className={cn("w-full justify-start text-muted-foreground", !open && "justify-center")}
        >
          <Trash2 className="h-4 w-4" />
          {open && <span className="text-xs">Clear history</span>}
        </Button>
        <Button
          variant="ghost"
          size={open ? "default" : "icon"}
          className={cn("w-full justify-start text-muted-foreground", !open && "justify-center")}
        >
          <Settings className="h-4 w-4" />
          {open && <span className="text-xs">Settings</span>}
        </Button>
      </div>
    </motion.aside>
  );
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
