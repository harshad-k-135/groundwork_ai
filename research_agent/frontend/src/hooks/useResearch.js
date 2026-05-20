import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_RESEARCH_DATA } from "../lib/constants";

const STAGE_TO_INDEX = {
  decompose: 0,
  retrieve: 1,
  synthesize: 2,
  complete: 3,
};

function buildApiUrl(path) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function useResearch({ onHistoryAdd }) {
  const [topic, setTopic] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [uiState, setUiState] = useState("idle");
  const [researchData, setResearchData] = useState(EMPTY_RESEARCH_DATA);
  const [statusIndex, setStatusIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Preparing research run");
  const [papersFound, setPapersFound] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const summaryWordCount = useMemo(() => {
    const summary = (researchData.summary || "").trim();
    return summary ? summary.split(/\s+/).length : 0;
  }, [researchData.summary]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const runAnalysis = useCallback(
    async (overrideTopic) => {
      const activeTopic = (overrideTopic ?? topic).trim();
      if (!activeTopic || uiState === "loading") return;

      try {
        setError("");
        setUiState("loading");
        setStatusIndex(STAGE_TO_INDEX.decompose);
        setProgressPercent(0);
        setLoadingMessage("Decomposing topic into search queries");
        setPapersFound(0);

        if (overrideTopic) setTopic(activeTopic);

        const response = await fetch(buildApiUrl("/research/stream"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: activeTopic,
            max_results: Math.min(20, Math.max(1, Number(maxResults) || 10)),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Research run failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\n");

          while (newlineIndex !== -1) {
            const rawLine = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            newlineIndex = buffer.indexOf("\n");

            if (!rawLine) continue;

            const event = JSON.parse(rawLine);

            if (event.type === "progress") {
              const nextProgress = Number(event.progress) || 0;
              setProgressPercent((prev) => Math.max(prev, nextProgress));
              setStatusIndex(STAGE_TO_INDEX[event.stage] ?? STAGE_TO_INDEX.retrieve);
              setLoadingMessage(String(event.message || "Searching papers"));
              setPapersFound(Number(event.papers_found) || 0);
            } else if (event.type === "result") {
              const nextData = {
                papers: event.data?.papers || [],
                summary: event.data?.summary || "",
                related_topics: event.data?.related_topics || [],
                total_found: event.data?.total_found || 0,
                unverified_count: event.data?.unverified_count || 0,
              };

              setResearchData(nextData);
              setProgressPercent(100);
              setLoadingMessage(`${nextData.total_found} paper${nextData.total_found === 1 ? "" : "s"} found`);
              setPapersFound(nextData.total_found || 0);
              setStatusIndex(STAGE_TO_INDEX.complete);
              onHistoryAdd?.(activeTopic, nextData.total_found);
              setUiState("report");
              return;
            } else if (event.type === "error") {
              throw new Error(String(event.detail || "Research run failed."));
            }
          }
        }

        throw new Error("Research run failed.");
      } catch (apiError) {
        const detail = apiError?.detail || apiError?.message || "Research run failed.";
        setError(String(detail));
        setUiState("idle");
        setProgressPercent(0);
        setLoadingMessage("Preparing research run");
        setPapersFound(0);
      }
    },
    [topic, maxResults, uiState, onHistoryAdd]
  );

  const copyReport = useCallback(async () => {
    if (!researchData.summary && !researchData.papers?.length) return;
    await navigator.clipboard.writeText(JSON.stringify(researchData, null, 2));
    setCopied(true);
  }, [researchData]);

  const startNewExploration = useCallback(() => {
    setUiState("idle");
    setStatusIndex(STAGE_TO_INDEX.decompose);
    setProgressPercent(0);
    setLoadingMessage("Preparing research run");
    setPapersFound(0);
  }, []);

  const hasReport = Boolean(researchData.summary || researchData.papers?.length);

  return {
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
    setError,
    summaryWordCount,
    runAnalysis,
    copyReport,
    startNewExploration,
    hasReport,
  };
}