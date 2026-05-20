import json
from queue import Queue
from threading import Thread

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
from starlette.concurrency import run_in_threadpool

from crew import run_research


load_dotenv()

app = FastAPI(title="Research Agent API")

allowed_origins = ["http://localhost:5173"]
frontend_url = os.getenv("FRONTEND_URL", "").strip()
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
async def research(payload: ResearchRequest) -> dict:
    try:
        result = await run_in_threadpool(run_research, payload.topic, payload.max_results)
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


@app.post("/research/stream")
def research_stream(payload: ResearchRequest) -> StreamingResponse:
    events: Queue[dict[str, object] | None] = Queue()

    def push_event(event: dict[str, object]) -> None:
        events.put(event)

    def worker() -> None:
        try:
            result = run_research(payload.topic, payload.max_results, progress_callback=push_event)
            events.put({"type": "result", "data": result})
        except Exception as error:
            events.put({"type": "error", "detail": str(error)})
        finally:
            events.put(None)

    def event_stream():
        thread = Thread(target=worker, daemon=True)
        thread.start()

        while True:
            item = events.get()
            if item is None:
                break
            yield json.dumps(item, ensure_ascii=False) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
