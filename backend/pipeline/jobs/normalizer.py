"""
Normalize raw scraped job postings into a common schema for storage and API.
"""

from __future__ import annotations

from typing import Any, Dict


def normalize_listing(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map a raw scraped job listing to the canonical schema:
    job_title, company, industry, skills, salary, location, posting_date.
    """
    raise NotImplementedError("Job normalizer is not yet implemented.")
