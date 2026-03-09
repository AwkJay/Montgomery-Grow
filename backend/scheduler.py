from apscheduler.schedulers.background import BackgroundScheduler
from pipeline.jobs.scraper_indeed import fetch_indeed_csv
from pipeline.jobs.scraper_usajobs import fetch_usajobs
from pipeline.jobs.scraper_jobaps import fetch_jobaps
from pipeline.jobs.normalizer import normalize_job
from pipeline.city.fetcher_gis import fetch_business_licenses
from database import upsert_jobs, upsert_business_licenses

scheduler = BackgroundScheduler()

def refresh_jobs():
    print("[Scheduler] Refreshing jobs...")
    raw = []
    raw += fetch_indeed_csv()    # from CSV — static, runs once
    raw += fetch_usajobs()       # live API
    raw += fetch_jobaps()        # live RSS

    normalized = [normalize_job(r) for r in raw]
    upsert_jobs(normalized)
    print(f"[Scheduler] Done — {len(normalized)} total jobs stored")

def refresh_city():
    print("[Scheduler] Refreshing city data...")
    upsert_business_licenses(fetch_business_licenses())
    print("[Scheduler] City data done")

def start_scheduler():
    refresh_jobs()     # run immediately on boot
    refresh_city()     # run immediately on boot

    scheduler.add_job(refresh_jobs,  "interval", hours=1)    # CSV is static so jobs refresh is fine hourly
    scheduler.add_job(refresh_city,  "interval", hours=6)    # GIS data changes slowly
    scheduler.start()
    print("[Scheduler] Started")