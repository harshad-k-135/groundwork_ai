import { motion } from "framer-motion";
import { SearchBar } from "./SearchBar";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero({ topic, maxResults, error, onTopicChange, onMaxResultsChange, onSubmit }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center"
    >
      <motion.div variants={item} className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-accent">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-accent" />
          AI-native research synthesis
        </span>
      </motion.div>

      <motion.h1
        variants={item}
        className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-7xl md:text-8xl"
      >
        <span className="bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          Explore
        </span>
        <br />
        <span className="bg-gradient-to-r from-accent via-amber-300 to-accent bg-clip-text text-transparent">
          what matters
        </span>
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
      >
        Deep field synthesis from ArXiv, Semantic Scholar, and academic web sources —
        powered by CrewAI intelligence.
      </motion.p>

      <motion.div variants={item} className="mt-12 w-full max-w-3xl">
        <SearchBar
          topic={topic}
          onTopicChange={onTopicChange}
          maxResults={maxResults}
          onMaxResultsChange={onMaxResultsChange}
          onSubmit={onSubmit}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 font-mono text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        variants={item}
        className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
      >
        {["ArXiv", "Semantic Scholar", "Tavily Web", "CrewAI Synthesis"].map((label) => (
          <span key={label} className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-accent/60" />
            {label}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}
