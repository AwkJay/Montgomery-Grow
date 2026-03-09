from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import create_tables
from scheduler import start_scheduler
from app.routes import jobs, business


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()        # create workforce.db tables
    start_scheduler()      # fetch all data immediately + start cron
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(jobs.router, prefix="/api")
app.include_router(business.router, prefix="/api")