import os
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pipeline import run_research_pipeline


ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"


class ResearchRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=250)


class ResearchResponse(BaseModel):
    topic: str
    duration_seconds: float
    results: dict[str, Any]


app = FastAPI(
    title="ResearchMind API",
    description="Backend API for the Multi-Agent Research System.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ResearchMind API"}


@app.post("/api/research", response_model=ResearchResponse)
def research(payload: ResearchRequest) -> ResearchResponse:
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Please enter a research topic.")

    missing_keys = [
        key for key in ("MISTRAL_API_KEY", "TAVILY_API_KEY") if not os.getenv(key)
    ]
    if missing_keys:
        raise HTTPException(
            status_code=500,
            detail=(
                "Missing required environment variables: "
                + ", ".join(missing_keys)
                + ". Add them before running research."
            ),
        )

    started = time.perf_counter()
    try:
        results = run_research_pipeline(topic)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ResearchResponse(
        topic=topic,
        duration_seconds=round(time.perf_counter() - started, 2),
        results=results,
    )
