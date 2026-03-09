from apscheduler.schedulers.background import BackgroundScheduler

from pipeline.jobs.scraper_indeed import fetch_indeed_csv
from pipeline.jobs.scraper_usajobs import fetch_usajobs
from pipeline.jobs.scraper_jobaps import fetch_jobaps
from pipeline.jobs.normalizer import normalize_job

from pipeline.city.fetcher_gis import fetch_business_licenses
from pipeline.city.fetcher_311 import fetch_311_data
from pipeline.city.fetcher_permits import fetch_construction_permits
from pipeline.city.fetcher_violations import fetch_code_violations

from database import (
    upsert_jobs,
    upsert_business_licenses,
    upsert_311,
    upsert_construction_permits,
    upsert_code_violations
)

scheduler = BackgroundScheduler()


def refresh_jobs():
    print("[Scheduler] Refreshing jobs...")

    raw = []
    raw += fetch_indeed_csv()    # CSV — static dataset
    raw += fetch_usajobs()       # live federal jobs API
    raw += fetch_jobaps()        # city jobs RSS

    normalized = [normalize_job(r) for r in raw]

    upsert_jobs(normalized)

    print(f"[Scheduler] Done — {len(normalized)} total jobs stored")


def refresh_city():
    print("[Scheduler] Refreshing city data...")

    # Business licenses
    licenses = fetch_business_licenses()
    upsert_business_licenses(licenses)

    # 311 service requests
    reports = fetch_311_data()
    upsert_311(reports)

    permits = fetch_construction_permits()
    if permits:
        upsert_construction_permits(permits)
        print(f"[DB] Saved {len(permits)} construction permits")
    
    violations = fetch_code_violations()
    if violations:
        upsert_code_violations(violations)

    print("[Scheduler] City data done")


def start_scheduler():

    # run once immediately when server starts
    refresh_jobs()
    refresh_city()

    # schedule recurring jobs
    scheduler.add_job(refresh_jobs, "interval", hours=1)
    scheduler.add_job(refresh_city, "interval", hours=6)

    scheduler.start()

    print("[Scheduler] Started")