"""
Neighborhood scoring engine: metrics, composite score, and narrative summary.
"""

from __future__ import annotations

from typing import Dict, Tuple

import numpy as np
import pandas as pd

from database import DataStore, filter_within_radius


def _normalized_ratio(local: float, citywide: float) -> float:
    """Map local vs citywide metric into [0,1] where 0.5 is average."""

    if citywide <= 0:
        return 0.5

    ratio = local / citywide

    if ratio <= 0:
        return 0.0
    if ratio >= 2.0:
        return 1.0

    return 0.25 + 0.25 * ratio


def compute_metrics(lat: float, lon: float, radius_km: float, store: DataStore):

    # ----------------------------
    # BUSINESS LICENSES
    # ----------------------------

    business_df = store.business_licenses

    recent_business = business_df[
        business_df["date"] >= business_df["date"].max() - pd.Timedelta(days=365)
    ]

    nearby_business = filter_within_radius(recent_business, lat, lon, radius_km)

    city_business_rate = len(recent_business) / 12.0
    local_business_rate = len(nearby_business) / 12.0

    new_businesses = _normalized_ratio(local_business_rate, city_business_rate)

    # ----------------------------
    # CONSTRUCTION PERMITS
    # ----------------------------

    permits_df = store.construction_permits

    recent_permits = permits_df[
        permits_df["issue_date"] >= permits_df["issue_date"].max()
        - pd.Timedelta(days=730)
    ]

    nearby_permits = filter_within_radius(recent_permits, lat, lon, radius_km)

    city_permit_value = recent_permits["permit_value"].sum() / 24.0
    local_permit_value = nearby_permits["permit_value"].sum() / 24.0

    permit_value = _normalized_ratio(local_permit_value, city_permit_value)

    # ----------------------------
    # 311 COMPLAINTS DATA
    # ----------------------------

    complaints_df = store.complaints

    recent_complaints = complaints_df[
        complaints_df["date"] >= complaints_df["date"].max()
        - pd.Timedelta(days=365)
    ]

    nearby_complaints = filter_within_radius(
        recent_complaints, lat, lon, radius_km
    )

    # ----------------------------
    # CODE VIOLATIONS
    # ----------------------------

    local_code = nearby_complaints["request_type"].str.contains(
        "code", case=False, na=False
    ).sum()

    city_code = complaints_df["request_type"].str.contains(
        "code", case=False, na=False
    ).sum()

    code_violations = 1.0 - _normalized_ratio(
        local_code / 12.0,
        city_code / 12.0
    )

    # ----------------------------
    # NUISANCES
    # ----------------------------

    nuisance_keywords = "noise|trash|abandoned|graffiti|dumping"

    local_nuisance = nearby_complaints["request_type"].str.contains(
        nuisance_keywords, case=False, na=False
    ).sum()

    city_nuisance = complaints_df["request_type"].str.contains(
        nuisance_keywords, case=False, na=False
    ).sum()

    nuisances = 1.0 - _normalized_ratio(
        local_nuisance / 12.0,
        city_nuisance / 12.0
    )

    # ----------------------------
    # OPEN 311 REQUESTS
    # ----------------------------

    local_open = nearby_complaints["status"].str.contains(
        "open", case=False, na=False
    ).sum()

    city_open = complaints_df["status"].str.contains(
        "open", case=False, na=False
    ).sum()

    open_311 = 1.0 - _normalized_ratio(
        local_open / 12.0,
        city_open / 12.0
    )

    # ----------------------------
    # FOOT TRAFFIC PROXY
    # ----------------------------

    local_activity = (
        len(nearby_complaints) +
        len(nearby_business) +
        len(nearby_permits)
    )

    city_activity = (
        len(complaints_df) +
        len(business_df) +
        len(permits_df)
    )

    foot_traffic = _normalized_ratio(
        local_activity / 12.0,
        city_activity / 12.0
    )

    return {
        "new_businesses": float(np.clip(new_businesses, 0.0, 1.0)),
        "permit_value": float(np.clip(permit_value, 0.0, 1.0)),
        "foot_traffic": float(np.clip(foot_traffic, 0.0, 1.0)),
        "code_violations": float(np.clip(code_violations, 0.0, 1.0)),
        "nuisances": float(np.clip(nuisances, 0.0, 1.0)),
        "open_311": float(np.clip(open_311, 0.0, 1.0)),
    }


def compute_score_and_grade(metrics: Dict[str, float]) -> Tuple[float, str]:
    """Combine metrics into a 0–100 opportunity score."""

    weights = {
        "new_businesses": 0.25,
        "permit_value": 0.25,
        "foot_traffic": 0.20,
        "code_violations": 0.10,
        "nuisances": 0.10,
        "open_311": 0.10,
    }

    composite = 0.0

    for key, weight in weights.items():
        composite += weight * metrics.get(key, 0.5)

    score = float(np.clip(composite * 100.0, 0.0, 100.0))

    if score >= 85:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 65:
        grade = "C"
    elif score >= 55:
        grade = "D"
    else:
        grade = "F"

    return score, grade


def build_summary(metrics: Dict[str, float], score: float, grade: str) -> str:
    """Create a narrative explanation of the score."""

    def describe(value: float, high: str, medium: str, low: str):
        if value >= 0.7:
            return high
        elif value >= 0.4:
            return medium
        else:
            return low

    business_sentence = describe(
        metrics["new_businesses"],
        "The area shows strong recent business formation.",
        "Business formation is roughly in line with the city average.",
        "Business formation is weaker than most parts of the city.",
    )

    development_sentence = describe(
        metrics["permit_value"],
        "Construction permit values indicate strong investment activity.",
        "Construction activity is moderate.",
        "Construction activity has been limited recently.",
    )

    activity_sentence = describe(
        metrics["foot_traffic"],
        "Local activity levels are high, suggesting strong demand.",
        "Foot traffic and local activity appear average.",
        "Activity levels appear lower than most neighborhoods.",
    )

    risk_score = (
        metrics["code_violations"] +
        metrics["nuisances"] +
        metrics["open_311"]
    ) / 3

    risk_sentence = describe(
        risk_score,
        "Quality-of-life indicators are favorable with relatively few complaints.",
        "Complaint levels are moderate compared to the city.",
        "Complaint levels are elevated and may pose operational risks.",
    )

    headline = (
        f"This location earns an economic opportunity score of "
        f"{score:.0f}/100, corresponding to a grade of {grade}."
    )

    return " ".join(
        [headline, business_sentence, development_sentence,
         activity_sentence, risk_sentence]
    )