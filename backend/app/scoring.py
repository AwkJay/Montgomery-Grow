from __future__ import annotations

from typing import Dict, Tuple

import numpy as np
import pandas as pd

from .data_loader import DataStore, filter_within_radius


def _normalized_ratio(local: float, citywide: float) -> float:
    """Map local vs citywide metric into [0, 1] where 0.5 is 'average'."""

    if citywide <= 0:
        return 0.5

    ratio = local / citywide
    # Compress extreme values but keep directionality
    # <= 0 => 0, >= 2x => 1, ~1x => 0.5
    if ratio <= 0:
        return 0.0
    if ratio >= 2.0:
        return 1.0
    return 0.25 + 0.25 * ratio  # ratio=1 -> 0.5


def compute_metrics(lat: float, lon: float, radius_km: float, store: DataStore) -> Dict[str, float]:
    """Compute normalized metrics around a point using citywide baselines."""

    # New business licenses in last 12 months
    business_df = store.business_licenses
    recent_business = business_df[business_df["opened_date"] >= business_df["opened_date"].max() - pd.Timedelta(days=365)]
    nearby_business = filter_within_radius(recent_business, lat, lon, radius_km)
    city_business_rate = len(recent_business) / 12.0  # per month
    local_business_rate = len(nearby_business) / 12.0
    new_businesses = _normalized_ratio(local_business_rate, city_business_rate)

    # Construction permit value nearby (last 24 months)
    permits_df = store.construction_permits
    recent_permits = permits_df[permits_df["issued_date"] >= permits_df["issued_date"].max() - pd.Timedelta(days=730)]
    nearby_permits = filter_within_radius(recent_permits, lat, lon, radius_km)
    city_permit_value = recent_permits["value"].sum() / 24.0  # per month
    local_permit_value = nearby_permits["value"].sum() / 24.0
    permit_value = _normalized_ratio(local_permit_value, city_permit_value)

    # Foot traffic (last 30 days, total visitors)
    traffic_df = store.foot_traffic
    recent_traffic = traffic_df[traffic_df["date"] >= traffic_df["date"].max() - pd.Timedelta(days=30)]
    nearby_traffic = filter_within_radius(recent_traffic, lat, lon, radius_km)
    city_traffic = recent_traffic["visitors"].sum() / 30.0
    local_traffic = nearby_traffic["visitors"].sum() / 30.0
    foot_traffic = _normalized_ratio(local_traffic, city_traffic)

    # Complaints: treat code violations, nuisances, and unresolved 311 as negatives
    complaints_df = store.complaints
    recent_complaints = complaints_df[complaints_df["opened_date"] >= complaints_df["opened_date"].max() - pd.Timedelta(days=365)]
    nearby_complaints = filter_within_radius(recent_complaints, lat, lon, radius_km)

    is_code_violation = nearby_complaints["type"].eq("Code violation")
    is_nuisance = nearby_complaints["type"].isin(["Noise", "Trash"])
    is_open_311 = nearby_complaints["status"].isin(["Open", "In Progress"])

    city_code_rate = recent_complaints["type"].eq("Code violation").sum() / 12.0
    city_nuisance_rate = recent_complaints["type"].isin(["Noise", "Trash"]).sum() / 12.0
    city_open_311_rate = recent_complaints["status"].isin(["Open", "In Progress"]).sum() / 12.0

    local_code_rate = is_code_violation.sum() / 12.0
    local_nuisance_rate = is_nuisance.sum() / 12.0
    local_open_311_rate = is_open_311.sum() / 12.0

    # For negatives, invert the ratio: more complaints -> lower score
    code_violations = 1.0 - _normalized_ratio(local_code_rate, city_code_rate)
    nuisances = 1.0 - _normalized_ratio(local_nuisance_rate, city_nuisance_rate)
    open_311 = 1.0 - _normalized_ratio(local_open_311_rate, city_open_311_rate)

    return {
        "new_businesses": float(np.clip(new_businesses, 0.0, 1.0)),
        "permit_value": float(np.clip(permit_value, 0.0, 1.0)),
        "foot_traffic": float(np.clip(foot_traffic, 0.0, 1.0)),
        "code_violations": float(np.clip(code_violations, 0.0, 1.0)),
        "nuisances": float(np.clip(nuisances, 0.0, 1.0)),
        "open_311": float(np.clip(open_311, 0.0, 1.0)),
    }


def compute_score_and_grade(metrics: Dict[str, float]) -> Tuple[float, str]:
    """Combine individual metrics into a 0–100 score and letter grade."""

    weights = {
        "new_businesses": 0.22,
        "permit_value": 0.22,
        "foot_traffic": 0.22,
        "code_violations": 0.12,
        "nuisances": 0.11,
        "open_311": 0.11,
    }

    composite = 0.0
    for key, weight in weights.items():
        composite += weight * metrics.get(key, 0.5)

    score = float(np.clip(composite * 100.0, 0.0, 100.0))

    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    elif score >= 60:
        grade = "D"
    else:
        grade = "F"

    return score, grade


def build_summary(metrics: Dict[str, float], score: float, grade: str) -> str:
    """Create a simple three-sentence narrative summary."""

    def describe(metric_value: float, high: str, medium: str, low: str) -> str:
        if metric_value >= 0.7:
            return high
        if metric_value >= 0.4:
            return medium
        return low

    business_sentence = describe(
        metrics["new_businesses"],
        "The area has strong recent business formation, suggesting healthy entrepreneurial activity.",
        "Recent business formation is steady and broadly in line with the city average.",
        "Recent business formation is relatively soft compared to the rest of the city.",
    )

    development_sentence = describe(
        metrics["permit_value"],
        "Construction permit value is high, indicating meaningful investment and real estate activity.",
        "Construction permits show a moderate level of new investment nearby.",
        "Construction permit activity has been light, which may signal slower near-term development.",
    )

    risk_sentence = describe(
        (metrics["code_violations"] + metrics["nuisances"] + metrics["open_311"]) / 3.0,
        "Quality-of-life indicators such as code violations and complaints are relatively favorable.",
        "Quality-of-life indicators are mixed, with some complaints but nothing unusually elevated.",
        "Quality-of-life indicators show elevated complaints and violations that could pose operational risks.",
    )

    headline = f"This location earns an overall economic opportunity score of {score:.0f} out of 100, corresponding to a grade of {grade}."
    return " ".join([headline, business_sentence, development_sentence, risk_sentence])


