from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.schemas import TopLocationCategory, VisitorOriginPoint, VisitorTrendPoint
from database import get_data_store

router = APIRouter(prefix="/api", tags=["population"])


@router.get("/visitors/trends", response_model=List[VisitorTrendPoint])
def visitor_trends() -> List[VisitorTrendPoint]:
    store = get_data_store()
    df = store.population_trends.copy().sort_values("month")
    return [
        VisitorTrendPoint(
            month=row["month"],
            residents=int(row["residents"]),
            commuters=int(row["commuters"]),
            visitors=int(row["visitors"]),
        )
        for _, row in df.iterrows()
    ]


@router.get("/visitors/origins", response_model=List[VisitorOriginPoint])
def visitor_origins() -> List[VisitorOriginPoint]:
    store = get_data_store()
    df = store.visitor_origins.copy().sort_values(["month", "region"])
    return [
        VisitorOriginPoint(
            month=row["month"],
            region=str(row["region"]),
            visitors=int(row["visitors"]),
        )
        for _, row in df.iterrows()
    ]


@router.get("/visitors/top-locations", response_model=List[TopLocationCategory])
def visitor_top_locations() -> List[TopLocationCategory]:
    store = get_data_store()
    df = store.top_locations.copy().sort_values(["month", "category"])
    return [
        TopLocationCategory(
            month=row["month"],
            category=str(row["category"]),
            visits=int(row["visits"]),
        )
        for _, row in df.iterrows()
    ]
