import json
import os
import re
import ast
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Callable, cast

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
    if item.get("status") == "no_results":
        return None

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


def _source_priority(source: str) -> int:
    if source == "semantic_scholar":
        return 0
    if source == "arxiv":
        return 1
    if source == "tavily":
        return 2
    return 3


def _paper_sort_key(paper: dict[str, Any]) -> tuple[int, int, str]:
    citation_count = paper.get("citation_count")
    citation_score = -(citation_count if isinstance(citation_count, int) else 0)
    return (
        _source_priority(str(paper.get("source") or "")),
        citation_score,
        _title_key(str(paper.get("title") or "")),
    )


def _build_synthesis_payload(papers: list[dict[str, Any]], limit: int) -> str:
    compact_papers: list[dict[str, Any]] = []
    for paper in sorted(papers, key=_paper_sort_key)[: max(1, limit)]:
        compact_papers.append(
            {
                "title": paper.get("title", ""),
                "authors": list(paper.get("authors", []))[:3],
                "abstract": str(paper.get("abstract") or "")[:160],
                "source": paper.get("source", "tavily"),
                "pdf_url": paper.get("pdf_url"),
                "paper_url": paper.get("paper_url") or "",
                "citation_count": paper.get("citation_count"),
                "relevance_tag": paper.get("relevance_tag"),
            }
        )

    return json.dumps(compact_papers, ensure_ascii=False, separators=(",", ":"))


def _normalize_search_results(source: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_papers: list[dict[str, Any]] = []

    for item in items:
        normalized_paper: dict[str, Any] | None
        if source == "arxiv":
            normalized_paper = _normalize_paper_from_arxiv(item)
        elif source == "semantic_scholar":
            normalized_paper = _normalize_paper_from_semantic(item)
        else:
            normalized_paper = _normalize_paper_from_tavily(item)

        if normalized_paper:
            normalized_papers.append(normalized_paper)

    return normalized_papers


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


def _search_all_sources(
    query: str,
    max_results: int,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    arxiv_papers: list[dict[str, Any]] = []
    semantic_papers: list[dict[str, Any]] = []
    web_papers: list[dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_source = {
            executor.submit(arxiv_search, query=query, max_results=max_results): "arxiv",
            executor.submit(semantic_scholar_search, query=query, max_results=max_results): "semantic_scholar",
            executor.submit(tavily_academic_search, query=query, max_results=max_results): "tavily",
        }

        for future in as_completed(future_to_source):
            source = future_to_source[future]
            try:
                results = future.result()
            except Exception:
                results = [{"status": "no_results", "source": source}]

            normalized_results = _normalize_search_results(source, results)
            if source == "arxiv":
                arxiv_papers.extend(normalized_results)
            elif source == "semantic_scholar":
                semantic_papers.extend(normalized_results)
            else:
                web_papers.extend(normalized_results)

            if progress_callback:
                progress_callback({"source": source, "papers": normalized_results})

    return arxiv_papers, semantic_papers, web_papers


def run_research(
    topic: str,
    max_results: int = 10,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
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

    search_progress_lock = Lock()
    completed_sources = 0
    unique_found_titles: set[str] = set()
    unique_found_count = 0

    def emit_progress(stage: str, progress: int, message: str) -> None:
        if not progress_callback:
            return
        progress_callback(
            {
                "type": "progress",
                "stage": stage,
                "progress": max(0, min(100, int(progress))),
                "message": message,
                "papers_found": unique_found_count,
            }
        )

    def record_source_progress(event: dict[str, Any]) -> None:
        nonlocal completed_sources, unique_found_count

        papers = event.get("papers", []) if isinstance(event, dict) else []
        with search_progress_lock:
            completed_sources += 1
            for paper in papers:
                title = str((paper or {}).get("title") or "").strip()
                if not title:
                    continue
                title_key = _title_key(title)
                if title_key in unique_found_titles:
                    continue
                unique_found_titles.add(title_key)
                unique_found_count += 1

            total_sources = max(1, len(queries) * 3)
            if completed_sources >= total_sources:
                progress = 85
            else:
                progress = 15 + int((completed_sources / total_sources) * 70)

            message = f"{unique_found_count} paper{'s' if unique_found_count != 1 else ''} found"
            if event.get("source"):
                message = f"{message} from {str(event.get('source')).replace('_', ' ')}"

        emit_progress("retrieve", progress, message)

    emit_progress("decompose", 5, "Decomposing topic into search queries")

    query_workers = min(3, len(queries)) or 1
    with ThreadPoolExecutor(max_workers=query_workers) as executor:
        future_to_query = {
            executor.submit(
                _search_all_sources,
                query=query,
                max_results=max_results,
                progress_callback=record_source_progress,
            ): query
            for query in queries
        }

        for future in as_completed(future_to_query):
            try:
                arxiv_results, semantic_results, tavily_results = future.result()
            except Exception:
                continue

            arxiv_papers.extend(arxiv_results)
            semantic_papers.extend(semantic_results)
            web_papers.extend(tavily_results)

    merged_papers = _merge_deduplicate(arxiv_papers, semantic_papers, web_papers)
    merged_papers = _enforce_limit(merged_papers, max_results)

    emit_progress("synthesize", 90, f"Synthesizing {len(merged_papers)} paper{'s' if len(merged_papers) != 1 else ''}")

    synthesis_limit = min(max_results, 12)
    papers_payload = _build_synthesis_payload(merged_papers, synthesis_limit)
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

    emit_progress("complete", 100, f"{response_payload['total_found']} papers found")

    with open(output_file_path, "w", encoding="utf-8") as file:
        json.dump(response_payload, file, ensure_ascii=False, indent=2)

    return response_payload
