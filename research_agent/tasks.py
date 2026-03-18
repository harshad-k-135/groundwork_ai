from crewai import Task


def create_decompose_task(topic: str, max_results: int, agents: dict) -> Task:
    return Task(
        description=(
            f"Topic: {topic}\n\n"
            f"Max results requested per source query: {max_results}\n\n"
            "Decompose the topic into exactly 3 precise academic search queries.\n"
            "Rules:\n"
            "1) Output exactly 3 numbered items and nothing else.\n"
            "2) Use field-specific terminology, avoid conversational language.\n"
            "3) Make each query retrieval-ready for ArXiv and academic search engines.\n"
            "4) Keep each query concise and distinct.\n\n"
            "Output format:\n"
            "1. ...\n2. ...\n3. ..."
        ),
        expected_output="Exactly 3 academic search queries as a numbered list.",
        agent=agents["query_strategist"],
    )


def create_retrieve_arxiv_task(topic: str, max_results: int, agents: dict, decompose_task: Task) -> Task:
    return Task(
        description=(
            f"Retrieve ArXiv papers for topic: {topic}.\n"
            f"Use max_results={max_results} per query.\n"
            "Consume the Query Strategist output, run ArXiv retrieval, and return structured paper dicts.\n"
            "Deduplicate by arxiv_id and explicitly flag no-results per query."
        ),
        expected_output="Structured list of ArXiv paper dicts with no fabricated data.",
        context=[decompose_task],
        agent=agents["query_strategist"],
    )


def create_retrieve_web_task(topic: str, max_results: int, agents: dict, decompose_task: Task) -> Task:
    return Task(
        description=(
            f"Retrieve web literature papers for topic: {topic}.\n"
            f"Use max_results={max_results} per query.\n"
            "Consume the Query Strategist output, run Tavily retrieval over academic domains only, "
            "and return structured results.\n"
            "When no results are found, output explicit no_results status and never fabricate papers."
        ),
        expected_output="Structured list of web paper dicts with explicit no_results statuses.",
        context=[decompose_task],
        agent=agents["query_strategist"],
    )


def create_synthesize_task(topic: str, agents: dict, papers_payload: str) -> Task:
    return Task(
        description=(
            f"Topic: {topic}\n\n"
            "You are given a merged paper list as JSON payload.\n"
            "Use ONLY papers from this payload; never invent papers, authors, years, links, or citations.\n\n"
            "CRITICAL: FILTER OUT papers that are not genuinely related to the topic.\n"
            "If a paper does not clearly relate to '{topic}', remove it from the output.\n"
            "Only keep papers that demonstrate CLEAR relevance to the domain.\n"
            "If uncertain about relevance, reject the paper.\n\n"
            "For each KEPT paper, assign exactly one relevance_tag:\n"
            "- foundational: Core papers that established the field or key concepts (prioritize FIRST)\n"
            "- recent: Recent advances and current state-of-the-art (prioritize SECOND)\n"
            "- tangential: Loosely related papers, different perspectives (prioritize LAST)\n"
            "Use citation counts, publication year, and content context for judgment.\n\n"
            "Then produce synthesis summary (250-400 words) with sections:\n"
            "- Overview of the field\n"
            "- Key contributions (cite specific papers)\n"
            "- Open problems\n"
            "Inline citation format: Author et al. YEAR\n"
            "If the cited paper source is unverified, append [unverified].\n\n"
            "After writing summary, suggest exactly 3 adjacent research directions that relate to this domain.\n\n"
            "Return valid JSON only with keys:\n"
            "papers, summary, related_topics, total_found, unverified_count\n"
            "Each papers item must include:\n"
            "title, authors, abstract (max 300 chars), source, relevance_tag, pdf_url, paper_url\n\n"
            f"PAPERS_PAYLOAD:\n{papers_payload}"
        ),
        expected_output=(
            "Valid JSON object with FILTERED papers, summary, related_topics (3 items), total_found, "
            "and unverified_count."
        ),
        agent=agents["synthesizer"],
    )
