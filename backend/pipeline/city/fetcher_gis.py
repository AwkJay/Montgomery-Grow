import httpx
import hashlib

BASE = "https://gis.montgomeryal.gov/server/rest/services/HostedDatasets"

def _query(endpoint: str, where: str, fields: str, count: int = 1000):
    r = httpx.get(f"{BASE}/{endpoint}/FeatureServer/0/query", params={
        "where":             where,
        "outFields":         fields,
        "returnGeometry":    "false",
        "resultRecordCount": count,
        "f":                 "json"
    }, timeout=15)
    return [f["attributes"] for f in r.json().get("features", [])]

def fetch_business_licenses():
    rows = _query(
        endpoint = "Business_License",
        where    = "pvYEAR >= 2022 AND CITY = 'YES'",
        fields   = "custCOMPANY_NAME,scNAME,pvrtDESC,pvYEAR,pvEFFDATE,Full_Address,CITY,addrZIP_PHYSICAL"
    )
    results = []
    for a in rows:
        if not a.get("scNAME"):
            continue
        raw_id = f"{a.get('custCOMPANY_NAME')}{a.get('pvEFFDATE')}"
        results.append({
            "id":       hashlib.md5(raw_id.encode()).hexdigest(),
            "name":     a.get("custCOMPANY_NAME"),
            "category": a.get("scNAME"),
            "type":     a.get("pvrtDESC"),        # "New" or "Renew"
            "year":     a.get("pvYEAR"),
            "date":     str(a.get("pvEFFDATE")),
            "address":  a.get("Full_Address"),
            "zip":      str(int(a["addrZIP_PHYSICAL"])) if a.get("addrZIP_PHYSICAL") else None,
            "in_city":  1 if a.get("CITY") == "YES" else 0
        })
    print(f"[GIS] Fetched {len(results)} business licenses")
    return results