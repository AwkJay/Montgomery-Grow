import httpx
import hashlib

BASE = "https://gis.montgomeryal.gov/server/rest/services/HostedDatasets"


def _query(endpoint: str, where: str = "1=1", fields: str = "*", count: int = 1000):

    r = httpx.get(
        f"{BASE}/{endpoint}/FeatureServer/0/query",
        params={
            "where": where,
            "outFields": fields,
            "returnGeometry": "true",
            "resultRecordCount": count,
            "f": "json"
        },
        timeout=30
    )

    data = r.json()
    features = data.get("features", [])

    rows = []

    for f in features:

        attr = f.get("attributes", {})
        geom = f.get("geometry", {})

        raw = f"{attr.get('CASE_NUMBER')}{attr.get('OPEN_DATE')}"

        rows.append({
            "id": hashlib.md5(raw.encode()).hexdigest(),

            "case_number": attr.get("CASE_NUMBER"),

            "violation_type": attr.get("VIOLATION_TYPE", "Unknown"),

            "status": attr.get("STATUS"),

            "open_date": str(attr.get("OPEN_DATE")),

            "address": attr.get("ADDRESS"),

            "lat": geom.get("y"),

            "lng": geom.get("x")
        })

    print(f"[GIS] Fetched {len(rows)} code violations")

    return rows


def fetch_code_violations():

    rows = _query(
        endpoint="Code_Violations",
        where="1=1",
        fields="*"
    )

    return rows