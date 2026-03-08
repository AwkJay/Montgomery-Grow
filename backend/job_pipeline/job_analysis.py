"""
Placeholder module for downstream analysis of Montgomery job postings.

Once real job postings are ingested (via `job_scraper.py` and Bright Data),
this module will:

- Transform raw postings into analytics-friendly tables (e.g., monthly trends)
- Compute workforce KPIs such as:
    - hiring velocity by industry and occupation
    - emerging and declining skills
    - salary bands by role, industry, and location
- Feed aggregated metrics into the FastAPI `/api/jobs/*` endpoints.

At present, the FastAPI layer uses hand-crafted mock data in `backend/app/jobs.py`
so the Job Postings & Workforce Analytics UI can be fully wired for future data.
"""


def recompute_kpis() -> None:
    """Placeholder hook for recomputing workforce analytics from raw postings."""

    raise NotImplementedError("Job analysis pipeline is not yet implemented; this is a placeholder stub.")


