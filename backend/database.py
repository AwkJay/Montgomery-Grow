import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "workforce.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # lets you access columns by name
    return conn

def create_tables():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS jobs (
            id           TEXT PRIMARY KEY,
            title        TEXT,
            company      TEXT,
            sector       TEXT,
            salary_min   REAL,
            salary_max   REAL,
            posted_date  TEXT,
            source       TEXT,
            link         TEXT,
            scraped_at   TEXT
        );

        CREATE TABLE IF NOT EXISTS business_licenses (
            id           TEXT PRIMARY KEY,
            name         TEXT,
            category     TEXT,
            type         TEXT,
            year         INTEGER,
            date         TEXT,
            address      TEXT,
            zip          TEXT,
            in_city      INTEGER
        );

        CREATE TABLE IF NOT EXISTS construction_permits (
            id           TEXT PRIMARY KEY,
            permit_type  TEXT,
            permit_value REAL,
            issue_date   TEXT,
            address      TEXT,
            lat          REAL,
            lng          REAL
        );

        CREATE TABLE IF NOT EXISTS code_violations (
            id           TEXT PRIMARY KEY,
            type         TEXT,
            address      TEXT,
            date         TEXT,
            district     TEXT,
            lat          REAL,
            lng          REAL
        );

        CREATE TABLE IF NOT EXISTS service_requests_311 (
            id           TEXT PRIMARY KEY,
            request_type TEXT,
            department   TEXT,
            neighborhood TEXT,
            status       TEXT,
            date         TEXT,
            lat          REAL,
            lng          REAL
        );

        CREATE TABLE IF NOT EXISTS score_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            score        REAL,
            job_velocity REAL,
            biz_growth   REAL,
            construction REAL,
            risk         REAL,
            computed_at  TEXT
        );
    """)
    conn.commit()
    conn.close()

# ── UPSERT FUNCTIONS ──────────────────────────────────────────
# "Upsert" = insert if new, replace if already exists
# This means running the scraper twice never creates duplicates

def upsert_jobs(jobs: list[dict]):
    conn = get_db()
    conn.executemany("""
        INSERT OR REPLACE INTO jobs
        VALUES (:id,:title,:company,:sector,:salary_min,:salary_max,
                :posted_date,:source,:link,:scraped_at)
    """, jobs)
    conn.commit()
    conn.close()
    print(f"[DB] Saved {len(jobs)} jobs")

def upsert_business_licenses(records: list[dict]):
    conn = get_db()
    conn.executemany("""
        INSERT OR REPLACE INTO business_licenses
        VALUES (:id,:name,:category,:type,:year,:date,:address,:zip,:in_city)
    """, records)
    conn.commit()
    conn.close()
    print(f"[DB] Saved {len(records)} business licenses")

def upsert_construction_permits(records: list[dict]):
    conn = get_db()
    conn.executemany("""
        INSERT OR REPLACE INTO construction_permits
        VALUES (:id,:permit_type,:permit_value,:issue_date,:address,:lat,:lng)
    """, records)
    conn.commit()
    conn.close()

def upsert_code_violations(records: list[dict]):
    conn = get_db()

    cleaned = []
    for r in records:
        cleaned.append({
            "id": r.get("id"),
            "type": r.get("violation_type"),
            "address": r.get("address"),
            "date": r.get("open_date"),
            "district": r.get("status"),
            "lat": r.get("lat"),
            "lng": r.get("lng"),
        })

    conn.executemany("""
        INSERT OR REPLACE INTO code_violations
        VALUES (:id,:type,:address,:date,:district,:lat,:lng)
    """, cleaned)

    conn.commit()
    conn.close()

    print(f"[DB] Saved {len(cleaned)} violations")
def upsert_311(records: list[dict]):
    conn = get_db()
    conn.executemany("""
        INSERT OR REPLACE INTO service_requests_311
        VALUES (:id,:request_type,:department,:neighborhood,:status,:date,:lat,:lng)
    """, records)
    conn.commit()
    conn.close()

def save_score(score: dict):
    conn = get_db()
    conn.execute("""
        INSERT INTO score_history
        (score, job_velocity, biz_growth, construction, risk, computed_at)
        VALUES (?,?,?,?,?,?)
    """, [
        score["score"],
        score["components"]["job_velocity"],
        score["components"]["biz_growth"],
        score["components"]["construction"],
        score["components"]["risk"],
        datetime.utcnow().isoformat()
    ])
    conn.commit()
    conn.close()

# ── READ FUNCTIONS (used by your API routes) ──────────────────

def get_all_jobs(limit=100):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM jobs ORDER BY scraped_at DESC LIMIT ?", [limit]
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_jobs_by_sector():
    conn = get_db()
    rows = conn.execute("""
        SELECT sector, COUNT(*) as count 
        FROM jobs 
        GROUP BY sector 
        ORDER BY count DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_job_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    new_week = conn.execute("""
        SELECT COUNT(*) FROM jobs 
        WHERE scraped_at >= datetime('now', '-7 days')
    """).fetchone()[0]
    top_sector = conn.execute("""
        SELECT sector, COUNT(*) as c FROM jobs 
        GROUP BY sector ORDER BY c DESC LIMIT 1
    """).fetchone()
    last_updated = conn.execute(
        "SELECT MAX(scraped_at) FROM jobs"
    ).fetchone()[0]
    conn.close()
    return {
        "total_jobs": total,
        "new_this_week": new_week,
        "top_sector": top_sector[0] if top_sector else None,
        "last_updated": last_updated
    }

def get_business_growth():
    conn = get_db()
    rows = conn.execute("""
        SELECT year, category, COUNT(*) as count
        FROM business_licenses
        WHERE in_city = 1
        GROUP BY year, category
        ORDER BY year DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_latest_score():
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM score_history ORDER BY computed_at DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return dict(row) if row else None

