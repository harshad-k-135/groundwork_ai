import os

from crewai import Agent, LLM


MODEL_NAME = "groq/llama-3.3-70b-versatile"


def _groq_llm() -> LLM:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY is missing. Add it to .env before running research.")

    return LLM(
        model=MODEL_NAME,
        api_key=groq_api_key,
        temperature=0.2,
    )


def create_agents() -> dict[str, object]:
    llm = _groq_llm()

    query_strategist = {
        "role": "Academic Search Strategist",
        "goal": (
            "Decompose the research topic into 3 precise academic queries optimized for ArXiv and "
            "scholarly web retrieval."
        ),
        "backstory": (
            "Expert in academic database search. Uses field-specific terminology and avoids "
            "conversational language."
        ),
    }

    arxiv_retriever = {
        "role": "Literature Retriever",
        "goal": (
            "For each query, run ArXiv and Semantic Scholar retrieval, merge structured results, "
            "and deduplicate by lowercase title."
        ),
        "backstory": (
            "Systematic retriever who never summarizes or interprets. Fetches, normalizes, and "
            "deduplicates raw metadata across trusted academic sources with explicit no-results."
        ),
    }

    web_scout = {
        "role": "Web Academic Scout",
        "goal": (
            "Run Tavily academic-domain search for each strategist query, return structured result "
            "records, and mark uncertain authenticity as unverified."
        ),
        "backstory": (
            "Scours the open web for academic content only. Never invents titles, authors, or links. "
            "Marks uncertain results with unverified=true."
        ),
    }

    synthesizer = Agent(
        role="Academic Research Synthesizer",
        goal=(
            "Produce citation-grounded synthesis, relevance tags per paper, and exactly three adjacent "
            "related research directions."
        ),
        backstory=(
            "Senior researcher who writes compact literature synthesis with inline citations like "
            "Author et al. YEAR. Tags each paper as foundational/recent/tangential based on citation "
            "signal and content context, and never cites papers outside the provided list."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    return {
        "query_strategist": query_strategist,
        "arxiv_retriever": arxiv_retriever,
        "web_scout": web_scout,
        "synthesizer": synthesizer,
    }
