import csv
import os

CSV_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "indeed_jobs.csv"
)


def fetch_indeed_csv():
    """Load job listings from backend/data/indeed_jobs.csv. Returns [] if file is missing."""
    if not os.path.isfile(CSV_PATH):
        print(f"[Indeed CSV] File not found: {CSV_PATH}. Place indeed_jobs.csv at backend/data/ to include Indeed jobs.")
        return []

    jobs = []
    try:
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Skip expired jobs
                if row.get("is_expired", "").lower() == "true":
                    continue

                jobs.append({
                    "job_id":       row.get("jobid", ""),
                    "title":        row.get("job_title", ""),
                    "company":      row.get("company_name", ""),
                    "description":  row.get("description_text", ""),
                    "job_type":     row.get("job_type", ""),
                    "location":     row.get("location", ""),
                    "salary":       row.get("salary_formatted", ""),
                    "posted_date":  row.get("date_posted_parsed", ""),
                    "apply_link":   row.get("apply_link", ""),
                    "source":       "Indeed"
                })
    except Exception as e:
        print(f"[Indeed CSV] Error reading {CSV_PATH}: {e}")
        return []

    print(f"[Indeed CSV] Loaded {len(jobs)} jobs")
    return jobs