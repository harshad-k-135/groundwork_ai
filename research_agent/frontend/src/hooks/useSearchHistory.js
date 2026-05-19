import { useCallback, useEffect, useState } from "react";
import { HISTORY_KEY } from "../lib/constants";

export function useSearchHistory() {
  const [historyItems, setHistoryItems] = useState([]);

  useEffect(() => {
    const existing = localStorage.getItem(HISTORY_KEY);
    if (!existing) return;
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) setHistoryItems(parsed);
    } catch {
      setHistoryItems([]);
    }
  }, []);

  const persistHistory = useCallback((nextItems) => {
    setHistoryItems(nextItems);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextItems));
  }, []);

  const addToHistory = useCallback(
    (searchedTopic, totalFound) => {
      const next = [
        {
          topic: searchedTopic,
          timestamp: new Date().toISOString(),
          total_found: totalFound,
        },
        ...historyItems.filter((item) => item.topic !== searchedTopic),
      ].slice(0, 10);
      persistHistory(next);
    },
    [historyItems, persistHistory]
  );

  const clearHistory = useCallback(() => {
    persistHistory([]);
  }, [persistHistory]);

  return { historyItems, addToHistory, clearHistory };
}
