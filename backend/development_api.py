from fastapi import APIRouter
from database import get_db

router = APIRouter()


@router.get("/development")
def get_development_activity(
    lat: float,
    lon: float,
    radius_km: float = 2.0
):
    """
    Return construction permits near a location.
    """

    conn = get_db()

    rows = conn.execute("""
        SELECT permit_type, permit_value, issue_date, lat, lng
        FROM construction_permits
        WHERE lat IS NOT NULL AND lng IS NOT NULL
        LIMIT 200
    """).fetchall()

    conn.close()

    permits = []

    for r in rows:
        permits.append({
            "lat": r["lat"],
            "lon": r["lng"],
            "value": r["permit_value"],
            "type": r["permit_type"],
            "date": r["issue_date"]
        })

    return {
        "count": len(permits),
        "permits": permits
    }