import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function RelatedTopics({ topics, onSelect }) {
  if (!topics?.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Explore adjacent vectors
      </p>
      <div className="flex flex-wrap gap-2">
        {topics.map((tag, idx) => (
          <motion.button
            key={tag}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(tag)}
            className="group inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass/40 px-5 py-2.5 text-sm text-foreground backdrop-blur-md transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            {tag}
            <ArrowRight className="h-3.5 w-3.5 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
