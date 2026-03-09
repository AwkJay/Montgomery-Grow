from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Query

from app.schemas import JobListing, JobSkillDemand, JobSummary, JobTrendPoint
from database import get_all_jobs, get_db, get_job_stats, get_jobs_by_sector

router = APIRouter()

@router.get("/jobs/sources")
def jobs_by_source():
    """Counts of jobs by source (Indeed/USAJOBS/JobAps...)."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT source, COUNT(*) as count
        FROM jobs
        GROUP BY source
        ORDER BY count DESC
        """
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/jobs/summary", response_model=JobSummary)
def job_summary() -> JobSummary:
    """
    High-level job postings and workforce summary for Montgomery.
    Backed by the SQLite jobs table via database.get_job_stats().
    """

    stats = get_job_stats()
    return JobSummary(
        total_jobs=stats["total_jobs"],
        jobs_this_month=stats["new_this_week"],
        top_industry=stats["top_sector"] or "N/A",
        top_skill="N/A",
    )


@router.get("/jobs/trends", response_model=List[JobTrendPoint])
def job_trends() -> List[JobTrendPoint]:
    """
    Simple trend line: count of job postings grouped by posted month (YYYY-MM).
    """

    conn = get_db()
    rows = conn.execute(
        """
        SELECT substr(posted_date, 1, 7) AS month, COUNT(*) AS postings
        FROM jobs
        WHERE posted_date IS NOT NULL AND posted_date != ''
        GROUP BY month
        ORDER BY month
        """
    ).fetchall()
    conn.close()

    return [JobTrendPoint(month=row["month"], postings=row["postings"]) for row in rows]


@router.get("/jobs/skills", response_model=List[JobSkillDemand])
def job_skills() -> List[JobSkillDemand]:
    """Aggregate most in-demand skills from normalized jobs table."""

    conn = get_db()
    rows = conn.execute(
        """
        SELECT skills
        FROM jobs
        WHERE skills IS NOT NULL AND skills != ''
        """
    ).fetchall()
    conn.close()

    counts: dict[str, int] = {}
    for r in rows:
        raw = r["skills"] or ""
        for skill in raw.split(","):
            s = skill.strip()
            if not s:
                continue
            counts[s] = counts.get(s, 0) + 1

    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:20]
    return [JobSkillDemand(skill=name, count=count) for name, count in top]


@router.get("/jobs/listings", response_model=List[JobListing])
def job_listings(limit: int = 100) -> List[JobListing]:
    """
    Latest normalized job listings, suitable for the Job Postings table.
    """

    rows = get_all_jobs(limit=limit)
    listings: List[JobListing] = []

    for r in rows:
        min_sal = r.get("salary_min")
        max_sal = r.get("salary_max")

        if min_sal is not None and max_sal is not None:
            salary = f"${min_sal:,.0f} - ${max_sal:,.0f}"
        elif min_sal is not None:
            salary = f"from ${min_sal:,.0f}"
        elif max_sal is not None:
            salary = f"up to ${max_sal:,.0f}"
        else:
            salary = "N/A"

        raw_skills = (r.get("skills") or "").split(",") if r.get("skills") else []
        skills = [s.strip() for s in raw_skills if s.strip()]

        listings.append(
            JobListing(
                job_title=(r.get("title") or "").strip(),
                company=(r.get("company") or "").strip(),
                industry=(r.get("sector") or "Other").strip(),
                salary=salary,
                location="Montgomery, AL",
                posting_date=str(r.get("posted_date") or ""),
                skills=skills,
            )
        )

    return listings


@router.get("/jobs/listings-page")
def job_listings_page(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=200),
    sort_field: str = Query(default="company"),
    sort_order: int = Query(default=1, description="1 for ASC, -1 for DESC"),
) -> dict:
    """
    Server-side (lazy) pagination for PrimeReact DataTable.
    Returns { data: JobListing[], total: number }.
    """

    allowed = {
        "job_title": "title",
        "company": "company",
        "industry": "sector",
        "salary": "salary_min",
        "posting_date": "posted_date",
    }
    order_col = allowed.get(sort_field, "company")
    order_dir = "ASC" if sort_order >= 0 else "DESC"

    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]

    rows = conn.execute(
        f"""
        SELECT title, company, sector, salary_min, salary_max, posted_date, source
        FROM jobs
        ORDER BY {order_col} {order_dir}, scraped_at DESC
        LIMIT ? OFFSET ?
        """,
        [limit, offset],
    ).fetchall()
    conn.close()

    data: list[dict] = []
    for r in rows:
        min_sal = r["salary_min"]
        max_sal = r["salary_max"]

        if min_sal is not None and max_sal is not None:
            salary = f"${min_sal:,.0f} - ${max_sal:,.0f}"
        elif min_sal is not None:
            salary = f"from ${min_sal:,.0f}"
        elif max_sal is not None:
            salary = f"up to ${max_sal:,.0f}"
        else:
            salary = "N/A"

        data.append(
            JobListing(
                job_title=(r["title"] or "").strip(),
                company=(r["company"] or "").strip(),
                industry=(r["sector"] or "Other").strip(),
                salary=salary,
                location="Montgomery, AL",
                posting_date=str(r["posted_date"] or ""),
                skills=[],
            ).model_dump()
        )

    return {"data": data, "total": int(total)}


@router.get("/jobs/industry-counts")
def job_industry_counts():
    """Counts of jobs by industry/sector for charts."""
    return get_jobs_by_sector()


@router.get("/jobs/debug")
def debug_summary():
    """
    Raw snapshot of what's currently stored in the jobs and business_licenses tables.
    Helpful to verify that the pipeline is ingesting data as expected.
    """

    conn = get_db()

    total_jobs = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]

    by_source = conn.execute(
        """
        SELECT source, COUNT(*) as count
        FROM jobs
        GROUP BY source
        ORDER BY count DESC
        """
    ).fetchall()

    by_sector = conn.execute(
        """
        SELECT sector, COUNT(*) as count
        FROM jobs
        GROUP BY sector
        ORDER BY count DESC
        """
    ).fetchall()

    sample = conn.execute(
        """
        SELECT title, company, source, sector, posted_date
        FROM jobs
        ORDER BY scraped_at DESC
        LIMIT 5
        """
    ).fetchall()

    biz_count = conn.execute(
        "SELECT COUNT(*) FROM business_licenses"
    ).fetchone()[0]

    biz_by_category = conn.execute(
        """
        SELECT category, COUNT(*) as count
        FROM business_licenses
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
        """
    ).fetchall()

    conn.close()

    return {
        "jobs": {
            "total": total_jobs,
            "by_source": [dict(r) for r in by_source],
            "by_sector": [dict(r) for r in by_sector],
            "sample": [dict(r) for r in sample],
        },
        "business_licenses": {
            "total": biz_count,
            "top_categories": [dict(r) for r in biz_by_category],
        },
    }
