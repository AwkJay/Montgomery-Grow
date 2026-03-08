from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class DataStore:
    """In-memory container for economic datasets used by the API."""

    business_licenses: pd.DataFrame
    construction_permits: pd.DataFrame
    foot_traffic: pd.DataFrame
    complaints: pd.DataFrame
    population_trends: pd.DataFrame
    visitor_origins: pd.DataFrame
    top_locations: pd.DataFrame


_DATA_STORE: Optional[DataStore] = None


def _random_coord(base_lat: float, base_lon: float, max_delta_km: float = 6.0) -> tuple[float, float]:
    """Generate a random coordinate within ~max_delta_km of a base point."""

    # Rough conversion: 1 degree of lat ~= 111km, 1 degree of lon ~= 92km near Montgomery
    max_delta_deg_lat = max_delta_km / 111.0
    max_delta_deg_lon = max_delta_km / 92.0
    dlat = np.random.uniform(-max_delta_deg_lat, max_delta_deg_lat)
    dlon = np.random.uniform(-max_delta_deg_lon, max_delta_deg_lon)
    return base_lat + dlat, base_lon + dlon


def _generate_mock_data(seed: int = 42) -> DataStore:
    """Generate synthetic-but-plausible datasets for Montgomery."""

    np.random.seed(seed)

    # Approximate Montgomery city center
    base_lat, base_lon = 32.3668, -86.3000
    today = datetime.utcnow().date()

    # Business licenses (last ~5 years)
    years = np.arange(today.year - 4, today.year + 1)
    categories = ["Restaurant", "Retail", "Services", "Tech", "Industrial"]

    business_rows = []
    biz_id = 1
    for year in years:
        for _ in range(np.random.randint(80, 160)):
            lat, lon = _random_coord(base_lat, base_lon)
            business_rows.append(
                {
                    "id": biz_id,
                    "name": f"Business {biz_id}",
                    "category": np.random.choice(categories, p=[0.25, 0.25, 0.2, 0.15, 0.15]),
                    "opened_date": datetime(year, np.random.randint(1, 13), np.random.randint(1, 28)).date(),
                    "lat": lat,
                    "lon": lon,
                    "active": np.random.rand() > 0.1,
                }
            )
            biz_id += 1

    business_licenses = pd.DataFrame(business_rows)

    # Construction permits (last ~5 years)
    permit_rows = []
    permit_id = 1
    for year in years:
        for _ in range(np.random.randint(40, 90)):
            lat, lon = _random_coord(base_lat, base_lon)
            permit_rows.append(
                {
                    "id": permit_id,
                    "permit_type": np.random.choice(["Residential", "Commercial", "Mixed-use"]),
                    "issued_date": datetime(year, np.random.randint(1, 13), np.random.randint(1, 28)).date(),
                    "value": float(np.random.lognormal(mean=11, sigma=0.5)),  # roughly 50k - 500k+
                    "lat": lat,
                    "lon": lon,
                }
            )
            permit_id += 1

    construction_permits = pd.DataFrame(permit_rows)

    # Foot traffic points (last 90 days)
    traffic_rows = []
    traffic_id = 1
    for days_ago in range(0, 90):
        date = today - timedelta(days=days_ago)
        for _ in range(np.random.randint(25, 60)):
            lat, lon = _random_coord(base_lat, base_lon)
            traffic_rows.append(
                {
                    "id": traffic_id,
                    "date": date,
                    "lat": lat,
                    "lon": lon,
                    "visitors": int(np.random.randint(20, 300)),
                }
            )
            traffic_id += 1

    foot_traffic = pd.DataFrame(traffic_rows)

    # Complaints / 311 (code violations, nuisances, etc.)
    complaint_types = ["Code violation", "Noise", "Trash", "Parking", "Other"]
    complaints_rows = []
    comp_id = 1
    for days_ago in range(0, 365):
        date = today - timedelta(days=days_ago)
        for _ in range(np.random.randint(8, 20)):
            lat, lon = _random_coord(base_lat, base_lon)
            complaints_rows.append(
                {
                    "id": comp_id,
                    "type": np.random.choice(complaint_types, p=[0.3, 0.2, 0.25, 0.15, 0.1]),
                    "opened_date": date,
                    "status": np.random.choice(["Open", "In Progress", "Closed"], p=[0.2, 0.3, 0.5]),
                    "lat": lat,
                    "lon": lon,
                }
            )
            comp_id += 1

    complaints = pd.DataFrame(complaints_rows)

    # Population / visitor trends (monthly for last 24 months)
    trend_rows = []
    origin_rows = []
    top_loc_rows = []

    base_residents = 200_000
    base_commuters = 40_000
    base_visitors = 30_000
    regions = ["Alabama (rest of state)", "Southeast US", "Midwest", "Northeast", "International"]
    loc_categories = ["Parks", "Museums", "Downtown", "Universities", "Shopping"]

    for months_ago in range(23, -1, -1):
        month_date = (today.replace(day=1) - pd.DateOffset(months=months_ago)).date()
        seasonal_factor = 1.0 + 0.1 * math.sin(2 * math.pi * (month_date.month / 12.0))

        residents = int(base_residents * np.random.uniform(0.97, 1.03))
        commuters = int(base_commuters * np.random.uniform(0.9, 1.1))
        visitors = int(base_visitors * seasonal_factor * np.random.uniform(0.9, 1.1))

        trend_rows.append(
            {
                "month": month_date,
                "residents": residents,
                "commuters": commuters,
                "visitors": visitors,
            }
        )

        # Visitor origins distribution for this month
        weights = np.random.dirichlet(np.ones(len(regions)))
        for region, w in zip(regions, weights):
            origin_rows.append(
                {
                    "month": month_date,
                    "region": region,
                    "visitors": int(visitors * float(w)),
                }
            )

        # Top locations by category
        loc_weights = np.random.dirichlet(np.ones(len(loc_categories)))
        for cat, w in zip(loc_categories, loc_weights):
            top_loc_rows.append(
                {
                    "month": month_date,
                    "category": cat,
                    "visits": int(visitors * float(w)),
                }
            )

    population_trends = pd.DataFrame(trend_rows)
    visitor_origins = pd.DataFrame(origin_rows)
    top_locations = pd.DataFrame(top_loc_rows)

    return DataStore(
        business_licenses=business_licenses,
        construction_permits=construction_permits,
        foot_traffic=foot_traffic,
        complaints=complaints,
        population_trends=population_trends,
        visitor_origins=visitor_origins,
        top_locations=top_locations,
    )


def get_data_store() -> DataStore:
    """Return a singleton DataStore, generating mock data on first access."""

    global _DATA_STORE
    if _DATA_STORE is None:
        _DATA_STORE = _generate_mock_data()
    return _DATA_STORE


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance between two lat/lon points in kilometers."""

    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def filter_within_radius(df: pd.DataFrame, lat: float, lon: float, radius_km: float) -> pd.DataFrame:
    """Return subset of df where points are within radius_km of the given location."""

    if df.empty:
        return df

    distances = df[["lat", "lon"]].apply(lambda row: haversine_km(lat, lon, row["lat"], row["lon"]), axis=1)
    return df[distances <= radius_km].copy()


