from __future__ import annotations
"""
311 / complaints and service requests fetcher for Montgomery.
"""

"""
311 / complaints and service requests fetcher for Montgomery.
"""
import httpx
import hashlib

BASE = "https://gis.montgomeryal.gov/server/rest/services/HostedDatasets"


def _query(endpoint: str, where: str, fields: str, count: int = 1000):
    r = httpx.get(
        f"{BASE}/{endpoint}/FeatureServer/0/query",
        params={
            "where": where,
            "outFields": fields,
            "returnGeometry": "true",
            "resultRecordCount": count,
            "f": "json"
        },
        timeout=20,
    )

    features = r.json().get("features", [])
    results = []

    for f in features:
        attr = f.get("attributes", {})
        geom = f.get("geometry", {})

        raw_id = f"{attr.get('REQUEST_ID')}{attr.get('CREATED_DATE')}"

        results.append({
            "id": hashlib.md5(raw_id.encode()).hexdigest(),

            "request_type": attr.get("REQUEST_TYPE", "Unknown"),
            "department": attr.get("DEPARTMENT", "Unknown"),
            "neighborhood": attr.get("NEIGHBORHOOD", "Unknown"),

            "status": attr.get("STATUS", "Unknown"),
            "date": str(attr.get("CREATED_DATE")),

            "lat": geom.get("y"),
            "lng": geom.get("x"),
        })

    return results

def fetch_311_data():
    """
    Fetch Montgomery 311 complaints and service requests.
    """

    rows = _query(
        endpoint="Received_311_Service_Request",
        where="1=1",
        fields="REQUEST_ID,REQUEST_TYPE,STATUS,CREATED_DATE",
    )

    print(f"[GIS] Fetched {len(rows)} 311 service requests")

    return rows