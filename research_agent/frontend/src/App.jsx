import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { pdf } from "@react-pdf/renderer";

import ReportDocument from "./pdf/ReportDocument";

const STATUS_MESSAGES = [
  "[ 01/04 ] DECOMPOSING QUERY VECTOR",
  "[ 02/04 ] SCANNING ARXIV DATABASE",
  "[ 03/04 ] QUERYING WEB SOURCES",
  "[ 04/04 ] SYNTHESIZING INTELLIGENCE",
];

const HISTORY_KEY = "groundwork_search_history";
const ease = [0.16, 1, 0.3, 1];
const citationSplitRegex = /([A-Z][a-z]+ et al\. \d{4}(?:\s*\[unverified\])?)/g;
const citationMatchRegex = /^[A-Z][a-z]+ et al\. \d{4}(?:\s*\[unverified\])?$/;

function slugifyTopic(topic) {
  return (
    (topic || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "literature-report"
  );
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString();
}

export default function App() {
  const [topic, setTopic] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [uiState, setUiState] = useState("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [researchData, setResearchData] = useState({
    papers: [],
    summary: "",
    related_topics: [],
    total_found: 0,
    unverified_count: 0,
  });
  const [statusIndex, setStatusIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const summaryWordCount = useMemo(() => {
    const summary = (researchData.summary || "").trim();
    return summary ? summary.split(/\s+/).length : 0;
  }, [researchData.summary]);

  useEffect(() => {
    const existing = localStorage.getItem(HISTORY_KEY);
    if (!existing) {
      return;
    }
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) {
        setHistoryItems(parsed);
      }
    } catch {
      setHistoryItems([]);
    }
  }, []);

  useEffect(() => {
    if (uiState !== "loading") {
      return;
    }
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [uiState]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const persistHistory = (nextItems) => {
    setHistoryItems(nextItems);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextItems));
  };

  const updateHistory = (searchedTopic, totalFound) => {
    const next = [
      {
        topic: searchedTopic,
        timestamp: new Date().toISOString(),
        total_found: totalFound,
      },
      ...historyItems.filter((item) => item.topic !== searchedTopic),
    ].slice(0, 10);
    persistHistory(next);
  };

  const runAnalysis = async (overrideTopic) => {
    const activeTopic = (overrideTopic ?? topic).trim();
    if (!activeTopic || uiState === "loading") {
      return;
    }

    try {
      setError("");
      setUiState("loading");
      setStatusIndex(0);
      if (overrideTopic) {
        setTopic(activeTopic);
      }

      const response = await axios.post("/research", {
        topic: activeTopic,
        max_results: Math.min(20, Math.max(1, Number(maxResults) || 10)),
      });

      const nextData = {
        papers: response.data.papers || [],
        summary: response.data.summary || "",
        related_topics: response.data.related_topics || [],
        total_found: response.data.total_found || 0,
        unverified_count: response.data.unverified_count || 0,
      };
      setResearchData(nextData);
      updateHistory(activeTopic, nextData.total_found);
      setUiState("report");
    } catch (apiError) {
      const detail = apiError?.response?.data?.detail || "Research run failed.";
      setError(String(detail));
      setUiState("idle");
    }
  };

  const copyReport = async () => {
    if (!researchData.summary && (!researchData.papers || researchData.papers.length === 0)) {
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(researchData, null, 2));
    setCopied(true);
  };

  const downloadPdf = async () => {
    if (!researchData.summary && researchData.papers.length === 0) {
      return;
    }

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

  const clearHistory = () => {
    persistHistory([]);
  };

  const resetState = () => {
    setUiState("idle");
    setResearchData({ papers: [], summary: "", related_topics: [], total_found: 0, unverified_count: 0 });
    setTopic("");
    setMaxResults(10);
    setStatusIndex(0);
    setError("");
    setCopied(false);
  };

  const highlightCitations = (text) => {
    const parts = (text || "").split(citationSplitRegex);
    return parts.map((part, index) => {
      if (citationMatchRegex.test(part)) {
        const numMatch = part.match(/\[(\d+)\]/);
        const displayNum = numMatch ? numMatch[1] : `P${index}`;
        return (
          <span key={`cite-${index}`} className="citation-badge" title={part}>
            {displayNum}
          </span>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  const sourceLabel = (source) => {
    if (source === "arxiv") {
      return "ARXIV";
    }
    if (source === "semantic_scholar") {
      return "S2";
    }
    if (source === "unverified") {
      return "UNVERIFIED";
    }
    return "WEB";
  };

  const relevanceLabel = (tag) => {
    const value = String(tag || "tangential").toLowerCase();
    if (value === "foundational") {
      return "FOUNDATIONAL";
    }
    if (value === "recent") {
      return "RECENT";
    }
    return "TANGENTIAL";
  };

  const sourcesUsed = useMemo(() => {
    return Array.from(new Set(researchData.papers.map((paper) => paper.source || "tavily")));
  }, [researchData.papers]);

  return (
    <div className="relative min-h-screen bg-bg-base text-text-primary">
      {/* SIDEBAR - 300px */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-[300px] border-r border-border bg-bg-surface flex flex-col">
        {/* Logo Area */}
        <div className="px-6 h-[64px] flex items-center gap-3">
          <div className="sidebar-logo-icon">
             <div className="sidebar-logo-item w-[20px]" />
             <div className="sidebar-logo-item w-[15px]" />
             <div className="sidebar-logo-item w-[10px]" />
          </div>
          <span className="font-display font-bold text-[16px] tracking-tight uppercase">GROUNDWORK</span>
        </div>
        
        <div className="h-[1px] w-full bg-border" />

        <div className="flex-1 flex flex-col p-6 space-y-8 overflow-hidden">
          <div>
            <p className="font-ui text-[10px] uppercase font-bold tracking-[0.1em] text-text-muted mb-6">RECENT EXPLORATIONS</p>
            
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar pr-1">
              {historyItems.length === 0 ? (
                <p className="font-ui text-[12px] text-text-muted">No search history available.</p>
              ) : (
                historyItems.map((item) => (
                  <button
                    key={`${item.topic}-${item.timestamp}`}
                    onClick={() => runAnalysis(item.topic)}
                    className={`group relative block w-full p-4 text-left transition-all duration-200 border-l-[3px] rounded-r-lg ${
                      topic === item.topic && uiState !== "idle" 
                        ? "history-item-active" 
                        : "border-transparent hover:bg-bg-elevated"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-ui text-[14px] font-medium leading-tight ${topic === item.topic && uiState !== "idle" ? "text-white" : "text-text-dim"}`}>
                        {item.topic}
                      </p>
                      <span className="font-ui text-[11px] text-text-muted whitespace-nowrap ml-2">
                        {new Date(item.timestamp).getHours()}h ago
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[11px] font-bold ${topic === item.topic && uiState !== "idle" ? "text-accent" : "text-text-muted"}`}>
                          📄 {item.total_found} Papers Found
                       </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Bottom */}
        <div className="p-6 space-y-4 border-t border-border">
          <button onClick={clearHistory} className="flex items-center gap-3 text-[13px] text-text-muted hover:text-white transition-colors">
             ⚙️ Settings
          </button>
          <button className="flex items-center gap-3 text-[13px] text-text-muted hover:text-white transition-colors">
             ❔ Documentation
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-[300px] min-h-screen">
        {/* TOP BAR */}
        <header className="h-[48px] border-b border-border flex items-center justify-between px-8 bg-bg-base/80 backdrop-blur-md sticky top-0 z-40">
           <div>
              <span className="font-mono text-[11px] text-text-muted px-2 py-0.5 border border-border rounded-md uppercase">v2.4.0-STABLE</span>
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                onClick={copyReport} 
                className="flex items-center gap-2 text-[13px] text-white border border border-border px-4 py-1.5 hover:bg-bg-elevated transition-colors"
                disabled={!researchData.summary}
              >
                  {copied ? "COPIED" : "COPY REPORT"}
              </button>
              <button 
                onClick={downloadPdf}
                className="flex items-center gap-2 text-[13px] font-bold text-bg-base bg-accent px-4 py-1.5 rounded hover:bg-accent-hover transition-colors"
                disabled={!researchData.summary}
              >
                  DOWNLOAD PDF
              </button>
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-bg-base font-bold text-[13px]">
                  👤
              </div>
           </div>
        </header>

        {/* PAGE BODY */}
        <div className="mx-auto w-full max-w-5xl px-12 py-16">
          
          <AnimatePresence mode="wait">
            {uiState === "idle" && (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col items-center py-20 text-center"
              >
                <h1 className="font-display text-[140px] font-extrabold text-white leading-[0.9] tracking-[-0.02em] mb-10 w-full overflow-hidden whitespace-nowrap">
                   GROUNDWORK
                </h1>
                
                <p className="font-ui text-[16px] text-text-dim max-w-[720px] leading-relaxed mb-16">
                   AI-powered research synthesis for deep field exploration. Enter a topic to generate a comprehensive field summary from academic sources.
                </p>

                {/* SEARCH UNIT - MATCHING REFERENCE */}
                <div className="w-full max-w-[780px] search-unit-container flex items-center p-1.5 focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                   <div className="pl-4 text-accent/80">
                      🔍
                   </div>
                   <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                    placeholder="Enter research topic (e.g. Transformers i..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 font-ui text-[15px] text-white placeholder:text-text-muted"
                   />
                   <div className="h-[32px] w-[1px] bg-border mx-2" />
                   <div className="flex items-center px-4 gap-3">
                      <span className="font-ui text-[10px] font-bold text-text-muted tracking-widest uppercase">PAPERS</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={maxResults || ""}
                        onChange={(e) => setMaxResults(Number(e.target.value))}
                        className="w-10 bg-transparent font-ui text-[14px] text-white outline-none border-none text-center"
                      />
                   </div>
                   <button
                    onClick={() => runAnalysis()}
                    disabled={!topic.trim()}
                    className="bg-accent text-bg-base font-bold text-[14px] px-8 py-3 rounded-md hover:bg-accent-hover transition-colors disabled:opacity-20"
                   >
                     RUN ANALYSIS
                   </button>
                </div>
                {error && (
                  <p className="mt-4 font-mono text-[11px] text-[#ff4d4d] tracking-widest uppercase">{error}</p>
                )}
              </motion.div>
            )}

            {uiState === "loading" && (
              <motion.div
                key="loading-state"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-20"
              >
                  {/* SEARCH UNIT STILL VISIBLE BUT DIMMED */}
                  <div className="w-full max-w-[780px] search-unit-container flex items-center p-1.5 opacity-30 pointer-events-none mb-10">
                     <div className="pl-4 text-accent/80">🔍</div>
                     <input value={topic} readOnly className="flex-1 bg-transparent border-none outline-none px-4 py-3 font-ui text-[15px]" />
                     <button className="bg-accent text-bg-base font-bold text-[14px] px-8 py-3 rounded-md">RUN ANALYSIS</button>
                  </div>

                  {/* LOADING PANEL */}
                  <div className="w-full max-w-[780px] loading-panel p-8">
                      <div className="flex justify-between items-start mb-8">
                         <div className="flex gap-4">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="text-accent text-[24px]"
                            >
                                🔄
                            </motion.div>
                            <div>
                               <p className="font-ui text-[17px] font-bold text-white mb-0.5">Synthesizing findings...</p>
                               <p className="font-mono text-[11px] text-text-muted tracking-widest uppercase">PROCESSING DATA STREAMS</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <p className="font-ui text-[28px] font-extrabold text-accent leading-none mb-1">
                                {Math.floor(((statusIndex + 1) * 90) / 4)}%
                             </p>
                             <p className="font-ui text-[10px] text-text-muted font-bold tracking-widest uppercase">COMPLETE</p>
                         </div>
                      </div>

                      <div className="progress-track mb-8">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((statusIndex + 1) * 90) / 4}%` }}
                            className="progress-fill"
                         />
                      </div>

                      <div className="flex justify-between font-mono text-[11px] tracking-tight">
                         <div className={statusIndex >= 1 ? "text-accent" : "text-text-muted"}>
                            <span className="status-dot" style={{ background: statusIndex >= 1 ? "#F5A623" : "#333" }} />
                            SEARCHING ARXIV... {statusIndex >= 1 ? "DONE" : "PENDING"}
                         </div>
                         <div className={statusIndex >= 2 ? "text-accent" : "text-text-muted"}>
                             <span className="status-dot" style={{ background: statusIndex >= 2 ? "#F5A623" : "#333" }} />
                             SEMANTIC SCHOLAR... {statusIndex >= 2 ? "DONE" : statusIndex >= 1 ? "READING" : "PENDING"}
                         </div>
                         <div className={statusIndex >= 3 ? "text-accent" : "text-text-muted"}>
                             <span className="status-dot" style={{ background: statusIndex >= 3 ? "#F5A623" : "#333" }} />
                             WEB SOURCES... {statusIndex >= 3 ? "DONE" : statusIndex >= 2 ? "SCANNING" : "PENDING"}
                         </div>
                      </div>
                  </div>
              </motion.div>
            )}

            {uiState === "report" && (
              <motion.div
                key="report-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-16"
              >
                {/* RESULTS HEADER */}
                <div className="flex justify-between items-end border-b border-border pb-8">
                  <h2 className="field-summary-heading">Field Summary</h2>
                  <div className="flex items-center gap-6 font-mono text-[11px] font-bold uppercase tracking-wider text-text-dim">
                     <div className="flex items-center gap-2">
                         <span className="status-dot" /> {summaryWordCount.toLocaleString()} WORDS
                     </div>
                     <div className="flex items-center gap-2">
                         <span className="status-dot" /> {researchData.papers.length} CITATIONS
                     </div>
                  </div>
                </div>

                {/* SUMMARY BLOCK */}
                <div className="font-ui text-[16px] leading-[1.8] text-white whitespace-pre-wrap">
                   {highlightCitations(researchData.summary)}
                </div>

                {/* Adjacents - Chips */}
                <div className="space-y-6 pt-10">
                  <p className="font-ui text-[12px] font-extrabold text-text-muted tracking-[0.1em] uppercase">EXPLORE ADJACENT VECTORS</p>
                  <div className="flex flex-wrap gap-3">
                    {researchData.related_topics.map((tag, idx) => (
                      <button
                        key={idx}
                        onClick={() => runAnalysis(tag)}
                        className="bg-bg-elevated border border-border px-6 py-2 rounded-full font-display text-[15px] text-white hover:border-accent group transition-all"
                      >
                         {tag} <span className="text-accent ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Papers section - Restyled */}
                <section className="space-y-10 pt-10">
                  <h3 className="font-display text-[28px] font-extrabold text-white">Retrieved Knowledge Base</h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {researchData.papers.map((paper, idx) => (
                      <div
                        key={idx}
                        className="bg-bg-elevated border border-border p-6 rounded-lg hover:border-accent/40 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex-1">
                              <h4 className="font-ui text-[18px] font-bold text-white mb-2 leading-snug group-hover:text-accent transition-colors">
                                {paper.title}
                              </h4>
                              <p className="font-ui text-[12px] text-text-dim uppercase tracking-tight font-medium">
                                {(paper.authors || []).join(" · ")}
                              </p>
                           </div>
                           <div className="flex flex-col items-end gap-2 ml-6 text-right shrink-0">
                               {String(paper.relevance_tag).toLowerCase() === "foundational" && (
                                 <span className="bg-accent text-bg-base font-mono text-[9px] px-2 py-0.5 font-bold uppercase rounded">FOUNDATIONAL</span>
                               )}
                               <span className="font-mono text-[10px] text-accent uppercase tracking-widest">{paper.source}</span>
                           </div>
                        </div>

                        <p className="font-ui text-[14px] text-text-dim leading-relaxed mb-6 line-clamp-3">
                          {paper.abstract}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-border">
                           <span className="font-mono text-[10px] text-text-muted">INDEX_ID: #{(idx + 1).toString().padStart(3, '0')}</span>
                           <a
                            href={paper.paper_url || paper.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-ui text-[12px] font-bold text-accent hover:underline flex items-center gap-1"
                           >
                              VIEW SOURCE DOCUMENT ↗
                           </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="pt-20 pb-40 flex justify-center">
                   <button 
                    onClick={() => setUiState("idle")}
                    className="flex items-center gap-3 text-[13px] font-bold text-text-muted border border-border px-8 py-4 rounded-lg hover:border-accent hover:text-white transition-all uppercase tracking-widest"
                   >
                       ← Start New Exploration
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
