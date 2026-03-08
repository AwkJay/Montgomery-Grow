from __future__ import annotations

from datetime import date
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data_loader import get_data_store
from .jobs import router as jobs_router
from .scoring import build_summary, compute_metrics, compute_score_and_grade
from .schemas import (
    AdvisorQueryRequest,
    AdvisorQueryResponse,
    BusinessLicensesPerYear,
    CategoryCount,
    ConstructionPermitFeature,
    HeatmapPoint,
    NeighborhoodScoreMetrics,
    NeighborhoodScoreRequest,
    NeighborhoodScoreResponse,
    TopLocationCategory,
    VisitorOriginPoint,
    VisitorTrendPoint,
)

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

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/neighborhood-score", response_model=NeighborhoodScoreResponse)
def neighborhood_score(payload: NeighborhoodScoreRequest) -> NeighborhoodScoreResponse:
    store = get_data_store()

    lat = payload.lat
    lon = payload.lon
    if lat is None or lon is None:
        # In a production system we would geocode the address.
        # For this prototype, default to approximate city center if coordinates are not provided.
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


@app.get("/api/business/licenses-per-year", response_model=List[BusinessLicensesPerYear])
def business_licenses_per_year() -> List[BusinessLicensesPerYear]:
    store = get_data_store()
    df = store.business_licenses.copy()
    df["year"] = df["opened_date"].apply(lambda d: d.year)
    grouped = df.groupby("year")["id"].count().reset_index(name="count")
    return [BusinessLicensesPerYear(year=int(row["year"]), count=int(row["count"])) for _, row in grouped.iterrows()]


@app.get("/api/business/category-distribution", response_model=List[CategoryCount])
def business_category_distribution() -> List[CategoryCount]:
    store = get_data_store()
    df = store.business_licenses.copy()
    grouped = df.groupby("category")["id"].count().reset_index(name="count")
    return [
        CategoryCount(category=str(row["category"]), count=int(row["count"]))
        for _, row in grouped.sort_values("count", ascending=False).iterrows()
    ]


@app.get("/api/business/density-heatmap", response_model=List[HeatmapPoint])
def business_density_heatmap() -> List[HeatmapPoint]:
    store = get_data_store()
    df = store.business_licenses[store.business_licenses["active"]].copy()

    # Simple equal-weight heatmap points (could be aggregated into tiles/bins)
    return [
        HeatmapPoint(lat=float(row["lat"]), lon=float(row["lon"]), weight=1.0)
        for _, row in df.iterrows()
    ]


@app.get("/api/development/permits", response_model=List[ConstructionPermitFeature])
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


@app.get("/api/visitors/trends", response_model=List[VisitorTrendPoint])
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


@app.get("/api/visitors/origins", response_model=List[VisitorOriginPoint])
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


@app.get("/api/visitors/top-locations", response_model=List[TopLocationCategory])
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


@app.post("/api/advisor/query", response_model=AdvisorQueryResponse)
def advisor_query(payload: AdvisorQueryRequest) -> AdvisorQueryResponse:
    store = get_data_store()

    # Try to anchor the query spatially if coordinates are provided
    lat = payload.lat
    lon = payload.lon
    if lat is None or lon is None:
        # Fallback to city center; in production we'd use NLP + geocoding to infer location
        lat, lon = 32.3668, -86.3000

    metrics = compute_metrics(lat=lat, lon=lon, radius_km=1.0, store=store)
    score, grade = compute_score_and_grade(metrics)

    # Very lightweight rule-based "advisor" that tailors tone to score band
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


@app.get("/api/metadata/years", response_model=list[int])
def available_years() -> list[int]:
    """Return the set of years for which we have permit and license data."""

    store = get_data_store()
    years: set[int] = set(
        int(y)
        for y in store.construction_permits["issued_date"].apply(lambda d: d.year).unique().tolist()
    )
    years.update(int(y) for y in store.business_licenses["opened_date"].apply(lambda d: d.year).unique().tolist())
    return sorted(years)


