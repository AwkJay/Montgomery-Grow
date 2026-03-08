"""
Placeholder module for the Montgomery Grow job postings pipeline.

In a future iteration, this module will be responsible for:

- Connecting to Bright Data (or similar) job scraping infrastructure
- Defining scraping jobs for major hiring platforms and local employer sites
- Normalizing raw scraped postings into a common schema:
    - job_title
    - company
    - industry
    - skills
    - salary
    - location
    - posting_date
- Persisting cleaned data to a database or data lake used by the FastAPI layer.

For now, all job-related API responses are powered by static mock data
defined in `backend/app/jobs.py`.
"""


def run_scraper() -> None:
    """Entry point for the future Bright Data-driven scraping process."""

    raise NotImplementedError("Job scraping is not yet implemented; this is a placeholder stub.")


