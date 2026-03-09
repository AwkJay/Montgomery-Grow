import httpx
import hashlib

BASE = "https://gis.montgomeryal.gov/server/rest/services/HostedDatasets"


def fetch_business_licenses():
    """Fetch business license records with lat/lng from the city's GIS."""

    url = f"{BASE}/Business_License/FeatureServer/0/query"
    all_records: list[dict] = []
    offset = 0

    while True:
        r = httpx.get(
            url,
            params={
                "where": "pvYEAR >= 2022 AND CITY = 'YES'",
                "outFields": "custCOMPANY_NAME,scNAME,pvrtDESC,pvYEAR,pvEFFDATE,Full_Address,addrZIP_PHYSICAL",
                "returnGeometry": "true",
                "geometryType": "esriGeometryPoint",
                "outSR": "4326",  # lat/lng
                "resultRecordCount": 1000,
                "resultOffset": offset,
                "f": "json",
            },
            timeout=15,
        )
        data = r.json()
        features = data.get("features", [])
        if not features:
            break

        for f in features:
            a = f.get("attributes") or {}
            geo = f.get("geometry") or {}

            if not a.get("scNAME"):
                continue
            if geo.get("x") is None or geo.get("y") is None:
                continue

            raw_id = f"{a.get('custCOMPANY_NAME')}{a.get('pvEFFDATE')}"
            all_records.append(
                {
                    "id": hashlib.md5(raw_id.encode()).hexdigest(),
                    "name": a.get("custCOMPANY_NAME"),
                    "category": a.get("scNAME"),
                    "type": a.get("pvrtDESC"),
                    "year": a.get("pvYEAR"),
                    "date": str(a.get("pvEFFDATE")),
                    "address": a.get("Full_Address"),
                    "zip": str(int(a["addrZIP_PHYSICAL"])) if a.get("addrZIP_PHYSICAL") else None,
                    "in_city": 1,
                    "lat": float(geo["y"]),
                    "lng": float(geo["x"]),
                }
            )

        offset += 1000
        print(f"[GIS] Fetched {len(all_records)} business licenses so far...")

        if not data.get("exceededTransferLimit"):
            break

    print(f"[GIS] Fetched {len(all_records)} business licenses")
    return all_records