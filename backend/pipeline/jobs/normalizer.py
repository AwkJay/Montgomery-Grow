import hashlib
import re
from datetime import datetime

SECTOR_KEYWORDS = {
    "Healthcare":    ["nurse","medical","health","clinical","doctor","pharmacy","dental","therapist","ehr"],
    "Technology":    ["software","developer","engineer","data","it ","cyber","network","cloud","analyst"],
    "Education":     ["teacher","principal","education","school","tutor","librarian","counselor"],
    "Public Safety": ["police","sheriff","corrections","firefighter","dispatcher","security","officer"],
    "Finance":       ["accountant","finance","auditor","banking","revenue","tax","budget"],
    "Construction":  ["construction","electrician","plumber","carpenter","mechanic","welder","hvac"],
    "Government":    ["administrator","coordinator","director","manager","clerk","city","county"],
    "Retail":        ["retail","sales","cashier","store","customer service","associate"],
    "Hospitality":   ["hotel","restaurant","chef","cook","hospitality","tourism","server"],
    "Transportation":["driver","logistics","transport","warehouse","supply chain","fleet"],
}

def infer_sector(title: str, description: str = "") -> str:
    text = (title + " " + description).lower()
    for sector, keywords in SECTOR_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return sector
    return "Other"

def parse_salary(salary_str: str):
    if not salary_str:
        return None, None
    numbers = re.findall(r"[\d,]+\.?\d*", salary_str.replace(",", ""))
    numbers = [float(n) for n in numbers if float(n) > 1000]
    if len(numbers) >= 2:
        return numbers[0], numbers[1]
    if len(numbers) == 1:
        return numbers[0], numbers[0]
    return None, None

def make_id(job_id: str, source: str) -> str:
    raw = f"{job_id}{source}"
    return hashlib.md5(raw.encode()).hexdigest()

def normalize_job(raw: dict) -> dict:
    salary_min, salary_max = parse_salary(raw.get("salary") or "")
    return {
        "id":          make_id(raw.get("job_id", ""), raw.get("source", "")),
        "title":       (raw.get("title") or "").strip(),
        "company":     (raw.get("company") or "Unknown").strip(),
        "sector":      infer_sector(
                           raw.get("title", ""),
                           raw.get("description", "")
                       ),
        "salary_min":  salary_min,
        "salary_max":  salary_max,
        "posted_date": raw.get("posted_date") or datetime.utcnow().isoformat(),
        "source":      raw.get("source", "Unknown"),
        "link":        raw.get("apply_link") or "",
        "scraped_at":  datetime.utcnow().isoformat()
    }