import { motion, AnimatePresence } from "framer-motion";
import { SearchBar } from "../search/SearchBar";

export function StickySearch({
  visible,
  topic,
  maxResults,
  loading,
  onTopicChange,
  onMaxResultsChange,
  onSubmit,
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-14 z-30 border-b border-glass-border/40 bg-background/80 px-6 py-4 backdrop-blur-2xl"
        >
          <div className="mx-auto max-w-4xl">
            <SearchBar
              topic={topic}
              onTopicChange={onTopicChange}
              maxResults={maxResults}
              onMaxResultsChange={onMaxResultsChange}
              onSubmit={onSubmit}
              loading={loading}
              compact
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
