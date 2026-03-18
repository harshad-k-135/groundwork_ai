import json
import os
import re
import ast
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, cast

from crewai import Agent, Crew, Process
from dotenv import load_dotenv

from agents import create_agents
from tasks import create_synthesize_task
from tools import arxiv_search, semantic_scholar_search, tavily_academic_search


load_dotenv()


def _slugify_topic(topic: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", topic.strip().lower()).strip("-")
    return slug or "untitled-topic"


def _build_queries(topic: str) -> list[str]:
    """Generate 3 strategic academic search queries focused on foundational and recent papers."""
    cleaned_topic = re.sub(r"\s+", " ", topic).strip()
    if not cleaned_topic:
        return []
    
    # Return 3 strategically decomposed queries without LLM (avoid overhead)
    return [
        f"foundational research and core concepts in {cleaned_topic}",
        f"recent advances and state-of-the-art in {cleaned_topic}",
        f"applications and related research domains of {cleaned_topic}",
    ]


def _normalize_paper_from_arxiv(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": item.get("title", ""),
        "authors": item.get("authors", []),
        "abstract": (item.get("abstract") or "")[:300],
        "source": "arxiv",
        "citation_count": item.get("citation_count"),
        "influential_citation_count": item.get("influential_citation_count"),
        "pdf_url": item.get("pdf_url"),
        "paper_url": item.get("paper_url") or item.get("pdf_url"),
        "arxiv_id": item.get("arxiv_id"),
        "unverified": False,
    }


def _normalize_paper_from_semantic(item: dict[str, Any]) -> dict[str, Any] | None:
    if item.get("status") == "no_results":
        return None

    return {
        "title": item.get("title", ""),
        "authors": item.get("authors", []),
        "abstract": (item.get("abstract") or "")[:300],
        "source": "semantic_scholar",
        "citation_count": item.get("citation_count"),
        "influential_citation_count": item.get("influential_citation_count"),
        "pdf_url": item.get("pdf_url"),
        "paper_url": item.get("paper_url") or "https://semanticscholar.org",
        "unverified": False,
    }


def _normalize_paper_from_tavily(item: dict[str, Any]) -> dict[str, Any] | None:
    if item.get("status") == "no_results":
        return None

    unverified = bool(item.get("unverified"))
    source = "unverified" if unverified else "tavily"

    return {
        "title": item.get("title", ""),
        "authors": [],
        "abstract": (item.get("snippet") or "")[:300],
        "source": source,
        "citation_count": item.get("citation_count"),
        "influential_citation_count": item.get("influential_citation_count"),
        "pdf_url": item.get("pdf_url"),
        "paper_url": item.get("paper_url") or item.get("url"),
        "unverified": unverified,
    }


def _title_key(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _merge_deduplicate(
    arxiv_papers: list[dict[str, Any]],
    semantic_papers: list[dict[str, Any]],
    web_papers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen_title_keys: set[str] = set()

    for paper in [*semantic_papers, *arxiv_papers, *web_papers]:
        title = paper.get("title", "")
        if not title:
            continue
        key = _title_key(title)
        if key in seen_title_keys:
            continue
        seen_title_keys.add(key)

        merged.append(
            {
                "title": title,
                "authors": paper.get("authors", []),
                "abstract": (paper.get("abstract") or "")[:300],
                "source": paper.get("source", "tavily"),
                "citation_count": paper.get("citation_count"),
                "influential_citation_count": paper.get("influential_citation_count"),
                "relevance_tag": paper.get("relevance_tag"),
                "pdf_url": paper.get("pdf_url"),
                "paper_url": paper.get("paper_url") or paper.get("pdf_url") or "",
            }
        )

    return merged


def _enforce_limit(papers: list[dict[str, Any]], max_results: int) -> list[dict[str, Any]]:
    if max_results <= 0:
        return []
    return papers[:max_results]


def _extract_json_object(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _default_related_topics(topic: str) -> list[str]:
    return [
        f"recent advances in {topic}",
        f"benchmark datasets for {topic}",
        f"open problems in {topic}",
    ]


def _coerce_relevance_tag(value: Any) -> str:
    tag = str(value or "").strip().lower()
    if tag in {"foundational", "recent", "tangential"}:
        return tag
    return "tangential"


def _extract_summary_from_json_like_text(text: str) -> str:
    try:
        parsed = _extract_json_object(text)
    except Exception:
        return ""
    if not isinstance(parsed, dict):
        return ""
    return str(parsed.get("summary") or "").strip()


def _format_summary_sections(summary_map: dict[str, Any]) -> str:
    sections = [
        ("Overview of the field", summary_map.get("Overview of the field") or summary_map.get("overview")),
        ("Key contributions", summary_map.get("Key contributions") or summary_map.get("contributions")),
        ("Open problems", summary_map.get("Open problems") or summary_map.get("open_problems")),
    ]
    chunks: list[str] = []
    for heading, body in sections:
        if not body:
            continue
        chunks.append(f"{heading}\n{str(body).strip()}")
    return "\n\n".join(chunks).strip()


def _normalize_summary_value(value: Any) -> str:
    if isinstance(value, dict):
        return _format_summary_sections(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return ""
        if text.startswith("{") and text.endswith("}"):
            try:
                parsed = ast.literal_eval(text)
                if isinstance(parsed, dict):
                    return _format_summary_sections(parsed)
            except Exception:
                return text
        return text
    return ""


def _search_all_sources(query: str, max_results: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    with ThreadPoolExecutor(max_workers=3) as executor:
        arxiv_future = executor.submit(arxiv_search, query=query, max_results=max_results)
        semantic_future = executor.submit(semantic_scholar_search, query=query, max_results=max_results)
        tavily_future = executor.submit(tavily_academic_search, query=query, max_results=max_results)

        return arxiv_future.result(), semantic_future.result(), tavily_future.result()


def run_research(topic: str, max_results: int = 10) -> dict[str, Any]:
    cleaned_topic = (topic or "").strip()
    if not cleaned_topic:
        raise ValueError("Topic is required.")
    if max_results < 1 or max_results > 20:
        raise ValueError("max_results must be between 1 and 20.")

    base_dir = os.path.dirname(__file__)
    output_dir = os.path.join(base_dir, "outputs")
    os.makedirs(output_dir, exist_ok=True)
    output_file_path = os.path.join(output_dir, f"{_slugify_topic(cleaned_topic)}.json")

    agents = create_agents()
    queries = _build_queries(cleaned_topic)

    arxiv_papers: list[dict[str, Any]] = []
    semantic_papers: list[dict[str, Any]] = []
    web_papers: list[dict[str, Any]] = []

    for query in queries:
        arxiv_results, semantic_results, tavily_results = _search_all_sources(query=query, max_results=max_results)

        for result in arxiv_results:
            arxiv_papers.append(_normalize_paper_from_arxiv(result))

        for result in semantic_results:
            normalized = _normalize_paper_from_semantic(result)
            if normalized:
                semantic_papers.append(normalized)

        for result in tavily_results:
            normalized = _normalize_paper_from_tavily(result)
            if normalized:
                web_papers.append(normalized)

    merged_papers = _merge_deduplicate(arxiv_papers, semantic_papers, web_papers)
    merged_papers = _enforce_limit(merged_papers, max_results)

    papers_payload = json.dumps(merged_papers, ensure_ascii=False, indent=2)
    synthesize_task = create_synthesize_task(cleaned_topic, agents, papers_payload)
    synthesizer_agent = cast(Agent, agents["synthesizer"])
    crew_cls = cast(Any, Crew)
    synthesis_crew = crew_cls(
        agents=[synthesizer_agent],
        tasks=[synthesize_task],
        process=Process.sequential,
        verbose=False,
    )

    synthesis_output = str(synthesis_crew.kickoff()).strip()

    parsed = {}
    try:
        parsed = _extract_json_object(synthesis_output)
    except Exception:
        parsed = {}

    parsed_papers = parsed.get("papers") if isinstance(parsed.get("papers"), list) else []
    parsed_by_title = {
        _title_key(str((paper or {}).get("title", ""))): paper
        for paper in (parsed_papers or [])
        if _title_key(str((paper or {}).get("title", "")))
    }

    normalized_output_papers: list[dict[str, Any]] = []
    for base_paper in merged_papers:
        key = _title_key(base_paper.get("title", ""))
        enriched = parsed_by_title.get(key, {}) or {}
        normalized_output_papers.append(
            {
                "title": base_paper.get("title", ""),
                "authors": enriched.get("authors") or base_paper.get("authors", []),
                "abstract": (enriched.get("abstract") or base_paper.get("abstract", ""))[:300],
                "source": base_paper.get("source", "tavily"),
                "relevance_tag": _coerce_relevance_tag(enriched.get("relevance_tag")),
                "pdf_url": base_paper.get("pdf_url"),
                "paper_url": base_paper.get("paper_url") or "",
            }
        )

    summary_text = _normalize_summary_value(parsed.get("summary"))
    if not summary_text:
        summary_text = _extract_summary_from_json_like_text(synthesis_output)
    if not summary_text:
        cleaned_text = re.sub(r"^```(?:text|markdown)?", "", synthesis_output).strip()
        cleaned_text = re.sub(r"```$", "", cleaned_text).strip()
        normalized_fallback = _normalize_summary_value(cleaned_text)
        summary_text = normalized_fallback or "Summary unavailable for this run. Please retry."

    related_topics = parsed.get("related_topics") if isinstance(parsed.get("related_topics"), list) else []
    clean_related_topics = [str(item).strip() for item in (related_topics or []) if str(item).strip()][:3]
    if len(clean_related_topics) < 3:
        clean_related_topics = _default_related_topics(cleaned_topic)

    response_payload = {
        "topic": cleaned_topic,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "queries": queries,
        "papers": normalized_output_papers,
        "summary": summary_text,
        "related_topics": clean_related_topics,
    }
    response_payload["total_found"] = len(response_payload["papers"])
    response_payload["unverified_count"] = sum(
        1 for paper in response_payload["papers"] if paper.get("source") == "unverified"
    )

    with open(output_file_path, "w", encoding="utf-8") as file:
        json.dump(response_payload, file, ensure_ascii=False, indent=2)

    return response_payload
