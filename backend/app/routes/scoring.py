from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas import (
    AdvisorQueryRequest,
    AdvisorQueryResponse,
    ConstructionPermitFeature,
    NeighborhoodScoreMetrics,
    NeighborhoodScoreRequest,
    NeighborhoodScoreResponse,
)
from database import get_data_store
from pipeline.city.scoring_engine import build_summary, compute_metrics, compute_score_and_grade

router = APIRouter(tags=["scoring"])  # routes use full paths under /api


@router.post("/neighborhood-score", response_model=NeighborhoodScoreResponse)
def neighborhood_score(payload: NeighborhoodScoreRequest) -> NeighborhoodScoreResponse:
    store = get_data_store()
    lat, lon = payload.lat, payload.lon
    if lat is None or lon is None:
        lat, lon = 32.3668, -86.3000
        if payload.address is None:
            raise HTTPException(
                status_code=400,
                detail="Either (lat, lon) or an address must be provided.",
            )

    metrics_dict = compute_metrics(lat=lat, lon=lon, radius_km=payload.radius_km, store=store)
    score, grade = compute_score_and_grade(metrics_dict)
    summary = build_summary(metrics_dict, score=score, grade=grade)
    metrics_model = NeighborhoodScoreMetrics(**metrics_dict)
    return NeighborhoodScoreResponse(score=score, grade=grade, summary=summary, metrics=metrics_model)


@router.post("/advisor/query", response_model=AdvisorQueryResponse)
def advisor_query(payload: AdvisorQueryRequest) -> AdvisorQueryResponse:
    store = get_data_store()
    lat, lon = payload.lat, payload.lon
    if lat is None or lon is None:
        lat, lon = 32.3668, -86.3000

    metrics = compute_metrics(lat=lat, lon=lon, radius_km=1.0, store=store)
    score, grade = compute_score_and_grade(metrics)

    if score >= 85:
        stance = "Overall, this area looks very promising for new investment."
    elif score >= 70:
        stance = "Overall, this area appears reasonably attractive, with some trade-offs to consider."
    elif score >= 55:
        stance = "Overall, the opportunity here is mixed and would benefit from a targeted, niche strategy."
    else:
        stance = "Overall, this location poses notable challenges and may not be ideal without a highly differentiated concept."

    location_phrase = payload.address or "this part of Montgomery"
    answer = (
        f"Looking at {location_phrase}, the composite economic opportunity score is about {score:.0f} "
        f"({grade} on an A–F scale). "
        "Recent business formation, construction activity, foot traffic, and complaint patterns around this location "
        "have been analyzed relative to citywide baselines. "
        f"{stance}"
    )

    return AdvisorQueryResponse(
        answer=answer,
        score=score,
        grade=grade,
        raw_metrics=metrics,
    )


@router.get("/development/permits", response_model=List[ConstructionPermitFeature])
def development_permits(year: int | None = None) -> List[ConstructionPermitFeature]:
    store = get_data_store()
    df = store.construction_permits.copy()
    if year is not None:
        df = df[df["issued_date"].apply(lambda d: d.year == year)]
    return [
        ConstructionPermitFeature(
            id=int(row["id"]),
            lat=float(row["lat"]),
            lon=float(row["lon"]),
            value=float(row["value"]),
            permit_type=str(row["permit_type"]),
            issued_date=row["issued_date"],
        )
        for _, row in df.iterrows()
    ]


@router.get("/metadata/years", response_model=List[int])
def available_years() -> List[int]:
    """Return the set of years for which we have permit and license data."""
    store = get_data_store()
    years: set[int] = set(
        int(y)
        for y in store.construction_permits["issued_date"].apply(lambda d: d.year).unique().tolist()
    )
    years.update(int(y) for y in store.business_licenses["opened_date"].apply(lambda d: d.year).unique().tolist())
    return sorted(years)
