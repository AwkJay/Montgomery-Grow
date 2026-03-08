"""
Scheduler for periodic pipeline tasks (job scrapers, city data fetchers, scoring refresh).

Can be extended with APScheduler, Celery, or cron. For now provides a simple
entry point that can be called from a process manager or external cron.
"""

from __future__ import annotations


def run_scheduled_tasks() -> None:
    """
    Run all scheduled pipeline tasks.
    Called by a cron job or scheduler; can be extended to run:
    - pipeline.jobs scrapers (Indeed, USAJobs, JobAPS)
    - pipeline.city fetchers (GIS, Census, 311)
    - scoring / KPI recompute
    """
    # Placeholder: wire to pipeline/jobs and pipeline/city when implemented
    pass
