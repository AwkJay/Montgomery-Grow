from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Query

from app.schemas import BusinessLicensesPerYear, CategoryCount, HeatmapPoint
from database import get_business_growth, get_db

router = APIRouter()


@router.get("/business/licenses-per-year", response_model=List[BusinessLicensesPerYear])
def business_licenses_per_year() -> List[BusinessLicensesPerYear]:
    rows = get_business_growth()
    by_year: dict[int, int] = {}
    for row in rows:
        year = int(row["year"])
        by_year[year] = by_year.get(year, 0) + int(row["count"])
    return [
        BusinessLicensesPerYear(year=year, count=count)
        for year, count in sorted(by_year.items())
    ]


@router.get("/business/category-distribution", response_model=List[CategoryCount])
def business_category_distribution() -> List[CategoryCount]:
    rows = get_business_growth()
    by_category: dict[str, int] = {}
    for row in rows:
        category = str(row["category"]) if row["category"] is not None else "Unknown"
        by_category[category] = by_category.get(category, 0) + int(row["count"])
    return [
        CategoryCount(category=category, count=count)
        for category, count in sorted(by_category.items(), key=lambda item: item[1], reverse=True)
    ]


@router.get("/business/density-heatmap", response_model=List[HeatmapPoint])
def business_density_heatmap() -> List[HeatmapPoint]:
    # Legacy endpoint kept for compatibility; prefer /business/heatmap.
    conn = get_db()
    rows = conn.execute(
        """
        SELECT lat, lng
        FROM business_licenses
        WHERE in_city = 1 AND lat IS NOT NULL AND lng IS NOT NULL
        """
    ).fetchall()
    conn.close()

    return [
        HeatmapPoint(lat=float(row["lat"]), lon=float(row["lng"]), weight=1.0)
        for row in rows
    ]


@router.get(
    "/business/licenses-per-year-filtered",
    response_model=List[BusinessLicensesPerYear],
    summary="Business licenses per year with optional filters",
)
def business_licenses_per_year_filtered(
    council_district: Optional[str] = Query(
        default=None,
        description="Council district identifier (column not yet populated; reserved for future use).",
    ),
    category: Optional[str] = Query(
        default=None,
        description="Business category to filter on (e.g. 'Restaurant').",
    ),
    status: Optional[str] = Query(
        default=None,
        description="License status / type (e.g. 'New', 'Renew').",
    ),
) -> List[BusinessLicensesPerYear]:
    """
    Return counts of business licenses per year, optionally filtered by category and status.

    Note: council_district is reserved for when that column is available in the database.
    """

    conn = get_db()

    sql = """
        SELECT year, COUNT(*) AS count
        FROM business_licenses
        WHERE in_city = 1
    """
    params: list[object] = []

    if category:
        sql += " AND category = ?"
        params.append(category)

    if status:
        # status is stored in the 'type' column (e.g. 'New', 'Renew').
        sql += " AND type = ?"
        params.append(status)

    # council_district filter will be added once that column exists.

    sql += " GROUP BY year ORDER BY year"

    rows = conn.execute(sql, params).fetchall()
    conn.close()

    return [
        BusinessLicensesPerYear(year=int(row["year"]), count=int(row["count"]))
        for row in rows
    ]


@router.get(
    "/business/license-statuses",
    response_model=List[str],
    summary="Distinct license status / type values available for filtering",
)
def business_license_statuses() -> List[str]:
    """Return all distinct license 'type' values (e.g. New, Renew) for UI filters."""

    conn = get_db()
    rows = conn.execute(
        """
        SELECT DISTINCT type
        FROM business_licenses
        WHERE type IS NOT NULL AND type != ''
        ORDER BY type
        """
    ).fetchall()
    conn.close()

    return [str(row["type"]) for row in rows]


@router.get("/business/heatmap")
def business_heatmap(category: Optional[str] = None, year: Optional[int] = None):
    """Return all business coordinates for the full city heatmap."""

    conn = get_db()
    where = "in_city = 1 AND lat IS NOT NULL AND lng IS NOT NULL"
    params: list[object] = []

    if category:
        where += " AND category = ?"
        params.append(category)
    if year is not None:
        where += " AND year = ?"
        params.append(year)

    rows = conn.execute(
        f"""
        SELECT lat, lng, category, name, address, year
        FROM business_licenses
        WHERE {where}
        """,
        params,
    ).fetchall()
    conn.close()

    return [dict(r) for r in rows]


@router.get("/business/heatmap/radius")
def business_heatmap_radius(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    radius_km: float = Query(2.0, description="Search radius in km"),
    category: Optional[str] = None,
):
    """Return businesses within N km of a point for location-based searches."""

    import math

    conn = get_db()
    where = "in_city = 1 AND lat IS NOT NULL AND lng IS NOT NULL"
    params: list[object] = []

    if category:
        where += " AND category = ?"
        params.append(category)

    rows = conn.execute(
        f"""
        SELECT lat, lng, category, name, address, year
        FROM business_licenses
        WHERE {where}
        """,
        params,
    ).fetchall()
    conn.close()

    def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.asin(math.sqrt(a))

    nearby: list[dict] = []
    for r in rows:
        d = distance_km(lat, lng, float(r["lat"]), float(r["lng"]))
        if d <= radius_km:
            item = dict(r)
            item["distance_km"] = round(d, 2)
            nearby.append(item)

    nearby.sort(key=lambda x: x["distance_km"])

    return {
        "center": {"lat": lat, "lng": lng},
        "radius_km": radius_km,
        "count": len(nearby),
        "businesses": nearby,
    }


@router.get("/business/categories")
def business_categories():
    """Return categories with counts for filters."""

    conn = get_db()
    rows = conn.execute(
        """
        SELECT category, COUNT(*) as count
        FROM business_licenses
        WHERE in_city = 1 AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        """
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
