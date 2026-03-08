from __future__ import annotations

from datetime import date
from typing import List

from fastapi import APIRouter

from .schemas import JobListing, JobSkillDemand, JobSummary, JobTrendPoint

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# --- Mock job market data (placeholder for future Bright Data pipeline) ---

MOCK_JOB_LISTINGS: list[JobListing] = [
    JobListing(
        job_title="Senior Data Analyst",
        company="Montgomery Health Systems",
        industry="Healthcare",
        salary="$95,000 - $115,000",
        location="Downtown Montgomery",
        posting_date=date(2026, 3, 1),
        skills=["SQL", "Python", "Excel", "Healthcare Analytics"],
    ),
    JobListing(
        job_title="Cloud DevOps Engineer",
        company="Riverfront Tech Labs",
        industry="Technology",
        salary="$110,000 - $135,000",
        location="Riverfront District",
        posting_date=date(2026, 2, 25),
        skills=["AWS", "CI/CD", "Terraform", "Linux"],
    ),
    JobListing(
        job_title="Retail Store Manager",
        company="Capitol Square Retail Group",
        industry="Retail",
        salary="$55,000 - $70,000",
        location="East Montgomery",
        posting_date=date(2026, 2, 20),
        skills=["Customer Service", "Inventory Management", "Excel"],
    ),
    JobListing(
        job_title="Construction Project Manager",
        company="Montgomery BuildCo",
        industry="Construction",
        salary="$95,000 - $125,000",
        location="West Montgomery",
        posting_date=date(2026, 3, 3),
        skills=["Project Management", "Scheduling", "OSHA Compliance"],
    ),
    JobListing(
        job_title="Full-Stack Software Engineer",
        company="Capital City Innovations",
        industry="Technology",
        salary="$105,000 - $130,000",
        location="Midtown Montgomery",
        posting_date=date(2026, 1, 30),
        skills=["Python", "React", "SQL", "AWS"],
    ),
    JobListing(
        job_title="Registered Nurse (ER)",
        company="Baptist Medical Center",
        industry="Healthcare",
        salary="$78,000 - $96,000",
        location="Central Montgomery",
        posting_date=date(2026, 3, 4),
        skills=["Patient Care", "Electronic Health Records", "Teamwork"],
    ),
    JobListing(
        job_title="Manufacturing Line Supervisor",
        company="Montgomery Industrial Partners",
        industry="Manufacturing",
        salary="$62,000 - $78,000",
        location="Industrial Park",
        posting_date=date(2026, 2, 10),
        skills=["Lean Manufacturing", "Safety Management", "Excel"],
    ),
    JobListing(
        job_title="Business Analyst",
        company="Montgomery City Ventures",
        industry="Professional Services",
        salary="$80,000 - $95,000",
        location="Downtown Montgomery",
        posting_date=date(2026, 1, 18),
        skills=["SQL", "Power BI", "Project Management"],
    ),
]


MOCK_JOB_TRENDS: list[JobTrendPoint] = [
    JobTrendPoint(month="Jan", postings=120),
    JobTrendPoint(month="Feb", postings=150),
    JobTrendPoint(month="Mar", postings=210),
    JobTrendPoint(month="Apr", postings=240),
    JobTrendPoint(month="May", postings=230),
    JobTrendPoint(month="Jun", postings=260),
]


MOCK_SKILL_DEMAND: list[JobSkillDemand] = [
    JobSkillDemand(skill="Python", count=48),
    JobSkillDemand(skill="SQL", count=55),
    JobSkillDemand(skill="AWS", count=37),
    JobSkillDemand(skill="Excel", count=62),
    JobSkillDemand(skill="Project Management", count=41),
]


def _compute_summary() -> JobSummary:
    total_jobs = len(MOCK_JOB_LISTINGS)

    # Treat jobs posted in the last 30 days as "this month" for the mock
    cutoff = date.today().toordinal() - 30
    jobs_this_month = sum(1 for job in MOCK_JOB_LISTINGS if job.posting_date.toordinal() >= cutoff)

    # Top industry by count
    industry_counts: dict[str, int] = {}
    for job in MOCK_JOB_LISTINGS:
        industry_counts[job.industry] = industry_counts.get(job.industry, 0) + 1
    top_industry = max(industry_counts, key=industry_counts.get) if industry_counts else "N/A"

    # Top skill by count
    top_skill = max(MOCK_SKILL_DEMAND, key=lambda s: s.count).skill if MOCK_SKILL_DEMAND else "N/A"

    return JobSummary(
        total_jobs=total_jobs,
        jobs_this_month=jobs_this_month,
        top_industry=top_industry,
        top_skill=top_skill,
    )


@router.get("/summary", response_model=JobSummary)
def job_summary() -> JobSummary:
    """High-level job postings and workforce summary for Montgomery."""

    return _compute_summary()


@router.get("/trends", response_model=List[JobTrendPoint])
def job_trends() -> List[JobTrendPoint]:
    """Job postings over time (mock monthly trend)."""

    return MOCK_JOB_TRENDS


@router.get("/skills", response_model=List[JobSkillDemand])
def job_skills() -> List[JobSkillDemand]:
    """Most in-demand skills based on recent job postings."""

    return MOCK_SKILL_DEMAND


@router.get("/listings", response_model=List[JobListing])
def job_listings() -> List[JobListing]:
    """Mock job listings for Montgomery, suitable for table display."""

    return MOCK_JOB_LISTINGS


