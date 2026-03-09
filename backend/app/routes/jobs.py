from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.schemas import JobListing, JobSkillDemand, JobSummary, JobTrendPoint
from database import get_all_jobs, get_db, get_job_stats, get_jobs_by_sector

router = APIRouter()


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
    """
    Placeholder: the current jobs schema does not store explicit skills,
    so this returns an empty list until skills are modeled in the database.
    """

    return []


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

        listings.append(
            JobListing(
                job_title=(r.get("title") or "").strip(),
                company=(r.get("company") or "").strip(),
                industry=(r.get("sector") or "Other").strip(),
                salary=salary,
                location="Montgomery, AL",
                posting_date=str(r.get("posted_date") or ""),
                skills=[],
            )
        )

    return listings


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
