import feedparser

FEEDS = {
    "JobAps-City":   "https://www.jobapscloud.com/MGM/rss.asp",
    "JobAps-County": "https://www.jobapscloud.com/MCCAL/rss.asp"
}

def fetch_jobaps():
    jobs = []
    for source_name, url in FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                jobs.append({
                    "job_id":      entry.get("id", entry.link),
                    "title":       entry.get("title", ""),
                    "company":     "City of Montgomery" if "MGM" in url else "Montgomery County",
                    "description": entry.get("summary", ""),
                    "job_type":    "Government",
                    "location":    "Montgomery, AL",
                    "salary":      None,
                    "posted_date": entry.get("published", ""),
                    "apply_link":  entry.get("link", ""),
                    "source":      source_name
                })
        except Exception as e:
            print(f"[JobAps] Failed {source_name}: {e}")

    print(f"[JobAps] Fetched {len(jobs)} jobs")
    return jobs