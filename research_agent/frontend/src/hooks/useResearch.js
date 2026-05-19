import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { EMPTY_RESEARCH_DATA, STATUS_MESSAGES } from "../lib/constants";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

export function useResearch({ onHistoryAdd }) {
  const [topic, setTopic] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [uiState, setUiState] = useState("idle");
  const [researchData, setResearchData] = useState(EMPTY_RESEARCH_DATA);
  const [statusIndex, setStatusIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const summaryWordCount = useMemo(() => {
    const summary = (researchData.summary || "").trim();
    return summary ? summary.split(/\s+/).length : 0;
  }, [researchData.summary]);

  const progressPercent = Math.min(
    95,
    Math.floor(((statusIndex + 1) * 90) / STATUS_MESSAGES.length)
  );

  useEffect(() => {
    if (uiState !== "loading") return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [uiState]);

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
        setStatusIndex(0);
        if (overrideTopic) setTopic(activeTopic);

        const response = await apiClient.post("/research", {
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
        onHistoryAdd?.(activeTopic, nextData.total_found);
        setUiState("report");
      } catch (apiError) {
        const detail = apiError?.response?.data?.detail || "Research run failed.";
        setError(String(detail));
        setUiState("idle");
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
