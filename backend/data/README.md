# Data folder

Place `indeed_jobs.csv` here for the job pipeline to load Indeed listings.

**Expected columns:**
- `jobid` – unique job identifier
- `job_title` – job title
- `company_name` – employer name
- `description_text` – job description (used for sector inference)
- `job_type` – e.g. Full-time, Part-time
- `location` – job location
- `salary_formatted` – salary string, e.g. "$95,000 - $115,000"
- `date_posted_parsed` – posting date (ISO or parseable format)
- `apply_link` – URL to apply
- `is_expired` – "true" or "false" (expired jobs are skipped)

Replace the sample `indeed_jobs.csv` with your own export, then restart the backend so the scheduler reloads the data.
