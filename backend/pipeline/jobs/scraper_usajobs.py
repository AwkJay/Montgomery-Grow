import httpx
import os

KEY   = os.getenv("USAJOBS_API_KEY")
EMAIL = os.getenv("USAJOBS_EMAIL")

def fetch_usajobs():
    headers = {
        "Authorization-Key": KEY,
        "User-Agent":         EMAIL,
        "Host":               "data.usajobs.gov"
    }
    params = {
        "LocationName":   "Montgomery, AL",
        "Radius":         "25",
        "ResultsPerPage": "50"
    }

    try:
        r = httpx.get(
            "https://data.usajobs.gov/api/search",
            headers=headers,
            params=params,
            timeout=10
        )
        items = r.json()["SearchResult"]["SearchResultItems"]
    except Exception as e:
        print(f"[USAJOBS] Failed: {e}")
        return []

    jobs = []
    for item in items:
        j = item["MatchedObjectDescriptor"]
        pay = j["PositionRemuneration"][0] if j.get("PositionRemuneration") else {}
        jobs.append({
            "job_id":      j["PositionID"],
            "title":       j["PositionTitle"],
            "company":     j["OrganizationName"],
            "description": j.get("QualificationSummary", ""),
            "job_type":    j.get("PositionSchedule", [{}])[0].get("Name", ""),
            "location":    j.get("PositionLocationDisplay", ""),
            "salary":      f"${pay.get('MinimumRange','?')} - ${pay.get('MaximumRange','?')}",
            "posted_date": j.get("PublicationStartDate", ""),
            "apply_link":  j.get("PositionURI", ""),
            "source":      "USAJOBS"
        })

    print(f"[USAJOBS] Fetched {len(jobs)} jobs")
    return jobs