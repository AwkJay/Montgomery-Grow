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

SKILLS_DICT = {
    # Technology
    "Python": ["python"],
    "R": [" r ", " r/", " r.", "rstudio"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite", "snowflake"],
    "JavaScript": ["javascript", " js ", " react", " node ", "vue", "angular"],
    "Cloud": ["aws", "azure", "cloud", "gcp", "google cloud"],
    "Cybersecurity": ["cybersecurity", "cyber ", "security clearance", "cissp"],
    "Networking": ["networking", "cisco", "network engineer"],
    "Data Analysis": ["data analysis", "analytics", "tableau", "power bi"],
    "Excel": ["excel", "spreadsheet", "microsoft office", "vlookup", "pivot table"],

    # Healthcare
    "Patient Care": ["patient care", "bedside", "clinical"],
    "EMR Systems": ["emr", "ehr", "epic", "meditech", "cerner"],
    "ICU": ["icu", "intensive care", "critical care"],
    "Phlebotomy": ["phlebotomy", "venipuncture"],
    "CPR": ["cpr", "bls", "acls", "pals"],
    "Medical Coding": ["icd", "cpt", "medical coding", "billing"],

    # Public Safety
    "Law Enforcement": ["law enforcement", "patrol", "criminal justice"],
    "Emergency Mgmt": ["emergency management", "fema", "disaster"],
    "Firearms": ["firearms", "weapons qualification"],

    # Finance
    "Accounting": ["accounting", "accounts payable", "accounts receivable"],
    "Budgeting": ["budgeting", "financial planning", "forecasting"],
    "Auditing": ["auditing", "audit ", "compliance"],
    "QuickBooks": ["quickbooks", "sage", "erp"],

    # Construction & Trades
    "Welding": ["welding", "welder"],
    "Electrical": ["electrical", "electrician", "wiring"],
    "HVAC": ["hvac", "heating", "cooling", "refrigeration"],
    "Plumbing": ["plumbing", "plumber", "pipefitting"],
    "CDL": [" cdl", "commercial driver", "class a", "class b"],
    "Heavy Equipment": ["heavy equipment", "forklift", "crane operator"],

    # Soft Skills / General
    "Leadership": ["leadership", "team lead", "supervisor", "management"],
    "Communication": ["communication", "interpersonal", "written communication"],
    "Customer Service": ["customer service", "client relations", "customer support"],
    "Project Mgmt": ["project management", "pmp", "agile", "scrum"],
    "Bilingual": ["bilingual", "spanish", "multilingual"],

    # Education
    "Teaching": ["teaching", "lesson plan", "curriculum", "classroom"],
    "Special Ed": ["special education", "iep", "disabilities"],

    # Government specific
    "Security Clearance": ["security clearance", "top secret", "secret clearance"],
    "Grant Writing": ["grant writing", "grants management"],
    "GIS": [" gis", "arcgis", "mapping", "geospatial"],
}


def extract_skills(title: str, description: str = "") -> list[str]:
    """Extract skills using the SKILLS_DICT keyword map."""

    text = (title + " " + (description or "")).lower()
    found: list[str] = []
    for skill_name, keywords in SKILLS_DICT.items():
        if any(kw in text for kw in keywords):
            found.append(skill_name)
    return sorted(set(found))

def normalize_job(raw: dict) -> dict:
    salary_min, salary_max = parse_salary(raw.get("salary") or "")
    skills = extract_skills(raw.get("title", "") or "", raw.get("description", "") or "")
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
        "skills":      ",".join(skills),
        "scraped_at":  datetime.utcnow().isoformat()
    }