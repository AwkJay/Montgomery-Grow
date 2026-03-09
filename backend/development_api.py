from fastapi import APIRouter
from database import get_db

router = APIRouter()


@router.get("/development/permits")
def get_development_activity(
    min_lat: float | None = None,
    max_lat: float | None = None,
    min_lon: float | None = None,
    max_lon: float | None = None,
    year: int | None = None
):
    """
    Return construction permits, optionally filtered by year and bounding box.
    """
    conn = get_db()
    
    query = """
        SELECT id, permit_type, permit_value, issue_date, lat, lng
        FROM construction_permits
        WHERE lat IS NOT NULL AND lng IS NOT NULL
    """
    params = []
    
    if min_lat is not None and max_lat is not None:
        query += " AND lat >= ? AND lat <= ?"
        params.extend([min_lat, max_lat])
        
    if min_lon is not None and max_lon is not None:
        query += " AND lng >= ? AND lng <= ?"
        params.extend([min_lon, max_lon])
        
    if year is not None:
        query += " AND CAST(strftime('%Y', issue_date) AS INTEGER) = ?"
        params.append(year)
        
    # Order by most recent and limit to 1000 to prevent crashing the map
    query += " ORDER BY issue_date DESC LIMIT 1000"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    permits = []
    for r in rows:
        permits.append({
            "id": r["id"],
            "lat": r["lat"],
            "lon": r["lng"],
            "value": r["permit_value"],
            "permit_type": r["permit_type"],
            "issued_date": r["issue_date"]
        })

    # Frontend expects an array directly, wait let's check frontend.
    # The frontend expects `ConstructionPermit[]` directly, not an object with `count` and `permits`.
    return permits