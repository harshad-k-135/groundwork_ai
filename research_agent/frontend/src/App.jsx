import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pdf } from "@react-pdf/renderer";
import ReportDocument from "./pdf/ReportDocument";
import { slugifyTopic } from "./lib/constants";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useResearch } from "./hooks/useResearch";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { StickySearch } from "./components/layout/StickySearch";
import { Hero } from "./components/search/Hero";
import { LoadingWorkflow } from "./components/loading/LoadingWorkflow";
import { ReportView } from "./components/report/ReportView";
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { historyItems, addToHistory, clearHistory } = useSearchHistory();

  const {
    topic,
    setTopic,
    maxResults,
    setMaxResults,
    uiState,
    researchData,
    statusIndex,
    progressPercent,
    loadingMessage,
    papersFound,
    copied,
    error,
    summaryWordCount,
    runAnalysis,
    copyReport,
    startNewExploration,
    hasReport,
  } = useResearch({ onHistoryAdd: addToHistory });

  const downloadPdf = async () => {
    if (!hasReport) return;

    const blob = await pdf(
      <ReportDocument
        topic={topic.trim()}
        summary={researchData.summary}
        papers={researchData.papers}
        relatedTopics={researchData.related_topics}
        totalFound={researchData.total_found}
      />
    ).toBlob();

    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `${slugifyTopic(topic)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const sidebarWidth = sidebarOpen ? 312 : 104;

  return (
    <motion.div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-mesh-gradient" aria-hidden />

      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        historyItems={historyItems}
        activeTopic={topic}
        uiState={uiState}
        onSelectTopic={runAnalysis}
        onClearHistory={clearHistory}
      />

      <motion.main
        className="min-h-screen transition-[margin] duration-350 ease-smooth"
        style={{ marginLeft: sidebarWidth }}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <Header
          copied={copied}
          canExport={Boolean(researchData.summary)}
          onCopy={copyReport}
          onDownload={downloadPdf}
        />

        <StickySearch
          visible={uiState === "loading" || uiState === "report"}
          topic={topic}
          maxResults={maxResults}
          loading={uiState === "loading"}
          onTopicChange={setTopic}
          onMaxResultsChange={setMaxResults}
          onSubmit={() => runAnalysis()}
        />

        <AnimatePresence mode="wait">
          {uiState === "idle" && (
            <Hero
              key="hero"
              topic={topic}
              maxResults={maxResults}
              error={error}
              onTopicChange={setTopic}
              onMaxResultsChange={setMaxResults}
              onSubmit={() => runAnalysis()}
            />
          )}

          {uiState === "loading" && (
            <LoadingWorkflow
              key="loading"
              topic={topic}
              statusIndex={statusIndex}
              progressPercent={progressPercent}
              loadingMessage={loadingMessage}
              papersFound={papersFound}
            />
          )}

          {uiState === "report" && (
            <ReportView
              key="report"
              researchData={researchData}
              summaryWordCount={summaryWordCount}
              onRelatedTopic={runAnalysis}
              onNewExploration={startNewExploration}
            />
          )}
        </AnimatePresence>
      </motion.main>
    </motion.div>
  );
}
