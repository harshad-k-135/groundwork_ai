from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from crew import run_research


load_dotenv()

app = FastAPI(title="Research Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str
    max_results: int = Field(default=10, ge=1, le=20)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/research")
def research(payload: ResearchRequest) -> dict:
    try:
        result = run_research(payload.topic, payload.max_results)
        papers = result.get("papers", [])

        relevance_order = {
            "foundational": 0,
            "recent": 1,
            "tangential": 2,
        }

        def sort_key(paper: dict) -> tuple[int, str]:
            tag = str(paper.get("relevance_tag") or "tangential").lower()
            return (relevance_order.get(tag, 3), str(paper.get("title") or ""))

        sorted_papers = sorted(papers, key=sort_key)
        return {
            "papers": sorted_papers,
            "summary": result.get("summary", ""),
            "related_topics": result.get("related_topics", []),
            "total_found": result.get("total_found", 0),
            "unverified_count": result.get("unverified_count", 0),
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
