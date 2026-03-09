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

    features = r.json().get("features", [])

    results = []

    for f in features:

        attr = f.get("attributes", {})
        geom = f.get("geometry", {})

        raw_id = f"{attr.get('PERMIT_NUMBER')}{attr.get('ISSUE_DATE')}"

        results.append({
            "id": hashlib.md5(raw_id.encode()).hexdigest(),

            "permit_type": attr.get("PERMIT_TYPE", "Unknown"),

            "permit_value": attr.get("PERMIT_VALUE", 0),

            "issue_date": str(attr.get("ISSUE_DATE")),

            "address": attr.get("ADDRESS", ""),

            "lat": geom.get("y"),

            "lng": geom.get("x"),
        })

    return results


def fetch_construction_permits():

    rows = _query(
        endpoint="Construction_Permits",
        where="1=1",
        fields="*"
    )

    print(f"[GIS] Fetched {len(rows)} construction permits")

    return rows