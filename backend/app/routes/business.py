from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.schemas import BusinessLicensesPerYear, CategoryCount, HeatmapPoint
from database import get_data_store

router = APIRouter(prefix="/api/business", tags=["business"])


@router.get("/licenses-per-year", response_model=List[BusinessLicensesPerYear])
def business_licenses_per_year() -> List[BusinessLicensesPerYear]:
    store = get_data_store()
    df = store.business_licenses.copy()
    df["year"] = df["opened_date"].apply(lambda d: d.year)
    grouped = df.groupby("year")["id"].count().reset_index(name="count")
    return [BusinessLicensesPerYear(year=int(row["year"]), count=int(row["count"])) for _, row in grouped.iterrows()]


@router.get("/category-distribution", response_model=List[CategoryCount])
def business_category_distribution() -> List[CategoryCount]:
    store = get_data_store()
    df = store.business_licenses.copy()
    grouped = df.groupby("category")["id"].count().reset_index(name="count")
    return [
        CategoryCount(category=str(row["category"]), count=int(row["count"]))
        for _, row in grouped.sort_values("count", ascending=False).iterrows()
    ]


@router.get("/density-heatmap", response_model=List[HeatmapPoint])
def business_density_heatmap() -> List[HeatmapPoint]:
    store = get_data_store()
    df = store.business_licenses[store.business_licenses["active"]].copy()
    return [
        HeatmapPoint(lat=float(row["lat"]), lon=float(row["lon"]), weight=1.0)
        for _, row in df.iterrows()
    ]
