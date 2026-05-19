import { motion } from "framer-motion";
import { Check, Copy, Download, User } from "lucide-react";
import { Button } from "../ui/button";

export function Header({ copied, canExport, onCopy, onDownload }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-glass-border/60 bg-background/60 px-6 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <span className="rounded-md border border-glass-border bg-glass/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          v2.4 · stable
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={!canExport}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-accent" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy report
            </>
          )}
        </Button>
        <Button variant="default" size="sm" onClick={onDownload} disabled={!canExport} className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </Button>
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-accent/20">
          <User className="h-4 w-4 text-accent" />
        </div>
      </motion.div>
    </header>
  );
}
