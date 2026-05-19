export const HISTORY_KEY = "groundwork_search_history";

export const WORKFLOW_STEPS = [
  {
    id: "decompose",
    label: "Query decomposition",
    detail: "Breaking topic into search vectors",
    icon: "decompose",
    threshold: 0,
  },
  {
    id: "arxiv",
    label: "ArXiv retrieval",
    detail: "Scanning preprint archives",
    icon: "arxiv",
    threshold: 1,
  },
  {
    id: "semantic",
    label: "Semantic Scholar",
    detail: "Cross-referencing citation graph",
    icon: "semantic",
    threshold: 2,
  },
  {
    id: "web",
    label: "Web sources",
    detail: "Academic web discovery",
    icon: "web",
    threshold: 3,
  },
  {
    id: "synthesize",
    label: "AI synthesis",
    detail: "CrewAI intelligence merge",
    icon: "synthesize",
    threshold: 4,
  },
];

export const STATUS_MESSAGES = WORKFLOW_STEPS.map(
  (step, i) => `[ ${String(i + 1).padStart(2, "0")}/${WORKFLOW_STEPS.length} ] ${step.label.toUpperCase()}`
);

export const EMPTY_RESEARCH_DATA = {
  papers: [],
  summary: "",
  related_topics: [],
  total_found: 0,
  unverified_count: 0,
};

export function slugifyTopic(topic) {
  return (
    (topic || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "literature-report"
  );
}

export function sourceLabel(source) {
  if (source === "arxiv") return "ArXiv";
  if (source === "semantic_scholar") return "Semantic Scholar";
  if (source === "unverified") return "Unverified";
  return "Web";
}

export function relevanceLabel(tag) {
  const value = String(tag || "tangential").toLowerCase();
  if (value === "foundational") return "Foundational";
  if (value === "recent") return "Recent";
  return "Tangential";
}
