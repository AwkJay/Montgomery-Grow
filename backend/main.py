"""
Montgomery Grow API entry point.

Run with: uvicorn main:app --reload
(from the backend/ directory)
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import business_router, jobs_router, population_router, scoring_router

app = FastAPI(
    title="Montgomery Grow API",
    description="Economic intelligence dashboard backend for Montgomery, Alabama.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)
app.include_router(business_router)
app.include_router(population_router)
app.include_router(scoring_router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
