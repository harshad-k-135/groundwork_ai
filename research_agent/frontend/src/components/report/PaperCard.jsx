import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import { relevanceLabel, sourceLabel } from "../../lib/constants";
import { cn } from "../../lib/utils";

export function PaperCard({ paper, index }) {
  const [expanded, setExpanded] = useState(false);
  const tag = String(paper.relevance_tag || "tangential").toLowerCase();
  const badgeVariant =
    tag === "foundational" ? "foundational" : tag === "recent" ? "recent" : "tangential";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group overflow-hidden rounded-2xl border border-glass-border bg-glass/30 backdrop-blur-xl transition-all duration-300",
        "hover:border-accent/30 hover:shadow-glow",
        expanded && "border-accent/25 shadow-glass"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="mt-1 font-mono text-[10px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
            {paper.title}
          </h4>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {(paper.authors || []).join(" · ") || "Unknown authors"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={badgeVariant}>{relevanceLabel(paper.relevance_tag)}</Badge>
          <Badge variant="source">{sourceLabel(paper.source)}</Badge>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-glass-border px-5 pb-5 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{paper.abstract}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  INDEX #{String(index + 1).padStart(3, "0")}
                </span>
                <a
                  href={paper.paper_url || paper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  View source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && paper.abstract && (
        <p className="line-clamp-2 px-5 pb-4 text-sm text-muted-foreground/80">{paper.abstract}</p>
      )}
    </motion.article>
  );
}
