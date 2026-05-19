import { motion } from "framer-motion";
import { FileText, Hash, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { highlightCitations } from "../../lib/citations";
import { PaperCard } from "./PaperCard";
import { RelatedTopics } from "./RelatedTopics";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function ReportView({
  researchData,
  summaryWordCount,
  onRelatedTopic,
  onNewExploration,
}) {
  const { papers, summary, related_topics, total_found, unverified_count } = researchData;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-4xl space-y-10 px-4 py-10 pb-24"
    >
      <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4 border-b border-glass-border pb-6">
        <motion.div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Field intelligence report
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Field Summary
          </h2>
        </motion.div>
        <div className="flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-accent" />
            {summaryWordCount.toLocaleString()} words
          </span>
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-accent" />
            {papers.length} papers
          </span>
          {unverified_count > 0 && (
            <span className="text-amber-400/80">{unverified_count} unverified</span>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="papers">
              Papers
              <span className="ml-1.5 rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                {total_found || papers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-glass-border bg-glass/25 p-6 backdrop-blur-xl sm:p-8"
            >
              <div className="prose prose-invert max-w-none text-[15px] leading-[1.85] text-foreground/90 whitespace-pre-wrap">
                {highlightCitations(summary)}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="papers">
            <motion.div className="space-y-4">
              {papers.map((paper, idx) => (
                <PaperCard key={`${paper.title}-${idx}`} paper={paper} index={idx} />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="topics">
            <RelatedTopics topics={related_topics} onSelect={onRelatedTopic} />
          </TabsContent>
        </Tabs>
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-center pt-8">
        <Button variant="outline" size="lg" onClick={onNewExploration} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Start new exploration
        </Button>
      </motion.div>
    </motion.div>
  );
}
