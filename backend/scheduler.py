from apscheduler.schedulers.background import BackgroundScheduler
from pipeline.jobs.scraper_indeed import fetch_indeed_csv
from pipeline.jobs.scraper_usajobs import fetch_usajobs
from pipeline.jobs.scraper_jobaps import fetch_jobaps
from pipeline.jobs.normalizer import normalize_job
from database import upsert_jobs

scheduler = BackgroundScheduler()


def refresh_jobs():
    print("[Scheduler] Refreshing jobs...")
    raw = []
    raw += fetch_indeed_csv()  # from CSV — static, runs once
    raw += fetch_usajobs()  # live API
    raw += fetch_jobaps()  # live RSS

    normalized = [normalize_job(r) for r in raw]
    upsert_jobs(normalized)
    print(f"[Scheduler] Done — {len(normalized)} total jobs stored")


def start_scheduler():
    # Only refresh jobs; business license GIS refresh is now manual to avoid long startup.
    refresh_jobs()  # run immediately on boot

    scheduler.add_job(refresh_jobs, "interval", hours=1)
    scheduler.start()
    print("[Scheduler] Started")