import os
import time
from typing import Any
from urllib.parse import urlparse

import feedparser
import requests
from tavily import TavilyClient


ACADEMIC_DOMAINS = [
    "arxiv.org",
    "semanticscholar.org",
    "paperswithcode.com",
    "openreview.net",
    "dl.acm.org",
    "ieeexplore.ieee.org",
    "springer.com",
    "researchgate.net",
]

ARXIV_API_URL = "https://export.arxiv.org/api/query"
ARXIV_USER_AGENT = "GroundworkAI/1.0 (contact@example.com)"
ARXIV_MAX_RESULTS = 10
ARXIV_TIMEOUT_SECONDS = 30


def _normalize_text(value: str, max_chars: int = 300) -> str:
    return " ".join((value or "").split())[:max_chars]


def _parse_arxiv_feed(feed: feedparser.FeedParserDict) -> list[dict[str, Any]]:
    papers: list[dict[str, Any]] = []
    entries = feed.get("entries", []) if isinstance(feed, dict) else []

    for entry in entries:
        entry_id = str(entry.get("id") or "").strip()
        arxiv_id = entry_id.rstrip("/").split("/")[-1].split("v")[0] if entry_id else ""

        pdf_url = ""
        for link in entry.get("links", []) or []:
            href = str(link.get("href") or "").strip()
            if not href:
                continue
            if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                pdf_url = href
                break

        if not pdf_url and arxiv_id:
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"

        authors = []
        for author in entry.get("authors", []) or []:
            name = str(author.get("name") or "").strip()
            if name:
                authors.append(name)

        papers.append(
            {
                "title": _normalize_text(str(entry.get("title") or ""), 500),
                "authors": authors,
                "abstract": _normalize_text(str(entry.get("summary") or ""), 300),
                "arxiv_id": arxiv_id,
                "pdf_url": pdf_url,
                "paper_url": entry_id or (f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else ""),
                "source": "arxiv",
                "citation_count": None,
                "influential_citation_count": None,
                "unverified": False,
            }
        )

    return papers


def arxiv_search(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    safe_max_results = max(1, min(int(max_results or 0), ARXIV_MAX_RESULTS))
    params = {
        "search_query": query,
        "start": 0,
        "max_results": safe_max_results,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    headers = {
        "User-Agent": ARXIV_USER_AGENT,
    }

    for attempt in range(3):
        try:
            response = requests.get(
                ARXIV_API_URL,
                params=params,
                headers=headers,
                timeout=ARXIV_TIMEOUT_SECONDS,
            )

            if response.status_code == 429:
                if attempt < 2:
                    time.sleep(5 * (attempt + 1))
                    continue
                return [{"status": "no_results", "source": "arxiv", "reason": "rate_limited"}]

            response.raise_for_status()
            feed = feedparser.parse(response.content)
            return _parse_arxiv_feed(feed) or [{"status": "no_results", "source": "arxiv"}]
        except requests.RequestException:
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            return [{"status": "no_results", "source": "arxiv"}]

    return [{"status": "no_results", "source": "arxiv"}]


def tavily_academic_search(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    tavily_api_key = os.getenv("TAVILY_API_KEY")
    if not tavily_api_key:
        raise ValueError("TAVILY_API_KEY is missing. Add it to .env before running research.")

    client = TavilyClient(api_key=tavily_api_key)
    response = client.search(
        query=query,
        max_results=max_results,
        search_depth="advanced",
        include_domains=ACADEMIC_DOMAINS,
    )

    results = response.get("results", []) if isinstance(response, dict) else []
    if not results:
        return [{"status": "no_results", "source": "tavily"}]

    papers: list[dict[str, Any]] = []
    for item in results:
        url = (item.get("url") or "").strip()
        lower_url = url.lower()
        is_pdf = lower_url.endswith(".pdf")
        host = (urlparse(url).hostname or "").lower()
        domain_verified = any(host == domain or host.endswith(f".{domain}") for domain in ACADEMIC_DOMAINS)

        papers.append(
            {
                "title": _normalize_text(item.get("title", ""), 500),
                "url": url,
                "snippet": _normalize_text(item.get("content", ""), 300),
                "pdf_url": url if is_pdf else None,
                "paper_url": url,
                "source": "tavily",
                "unverified": not domain_verified,
                "citation_count": None,
                "influential_citation_count": None,
            }
        )

    return papers


def semantic_scholar_search(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    endpoint = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": max_results,
        "fields": (
            "title,authors,abstract,citationCount,influentialCitationCount,"
            "externalIds,openAccessPdf"
        ),
    }

    time.sleep(1)
    try:
        response = requests.get(endpoint, params=params, timeout=30)
        if response.status_code == 429:
            return [{"status": "no_results", "source": "semantic_scholar", "reason": "rate_limited"}]
        response.raise_for_status()
    except requests.RequestException:
        return [{"status": "no_results", "source": "semantic_scholar"}]

    payload = response.json() if response.content else {}
    results = payload.get("data", []) if isinstance(payload, dict) else []
    if not results:
        return [{"status": "no_results", "source": "semantic_scholar"}]

    papers: list[dict[str, Any]] = []
    for item in results:
        title = _normalize_text(item.get("title", ""), 500)
        abstract = _normalize_text(item.get("abstract", ""), 300)
        citation_count = item.get("citationCount")
        influential_citation_count = item.get("influentialCitationCount")

        raw_authors = item.get("authors", []) or []
        author_names = [author.get("name", "").strip() for author in raw_authors if author.get("name")]
        if len(author_names) > 3:
            author_names = [*author_names[:3], "et al."]

        external_ids = item.get("externalIds", {}) or {}
        paper_id = item.get("paperId") or external_ids.get("CorpusId") or external_ids.get("ArXiv")
        paper_id_str = str(paper_id).strip() if paper_id is not None else ""
        paper_url = (
            f"https://semanticscholar.org/paper/{paper_id_str}"
            if paper_id_str
            else "https://semanticscholar.org"
        )

        open_access_pdf = item.get("openAccessPdf") or {}
        pdf_url = open_access_pdf.get("url") if isinstance(open_access_pdf, dict) else None

        papers.append(
            {
                "title": title,
                "authors": author_names,
                "abstract": abstract,
                "citation_count": citation_count if isinstance(citation_count, int) else None,
                "influential_citation_count": (
                    influential_citation_count if isinstance(influential_citation_count, int) else None
                ),
                "source": "semantic_scholar",
                "pdf_url": pdf_url,
                "paper_url": paper_url,
                "unverified": False,
            }
        )

    return papers
