from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class NeighborhoodScoreRequest(BaseModel):
    address: Optional[str] = Field(
        default=None,
        description="Human-readable address in Montgomery. Optional if lat/lon are provided.",
    )
    lat: Optional[float] = Field(default=None, description="Latitude of the point of interest.")
    lon: Optional[float] = Field(default=None, description="Longitude of the point of interest.")
    radius_km: float = Field(
        default=1.0,
        gt=0,
        le=10,
        description="Search radius around the point, in kilometers.",
    )


class NeighborhoodScoreMetrics(BaseModel):
    new_businesses: float
    permit_value: float
    foot_traffic: float
    code_violations: float
    nuisances: float
    open_311: float


class NeighborhoodScoreResponse(BaseModel):
    score: float = Field(..., description="Economic opportunity score between 0 and 100.")
    grade: str = Field(..., description="Letter grade (A–F) derived from the score.")
    summary: str = Field(..., description="Three-sentence natural-language summary.")
    metrics: NeighborhoodScoreMetrics


class TimeSeriesPoint(BaseModel):
    period: date
    value: float


class BusinessLicensesPerYear(BaseModel):
    year: int
    count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class HeatmapPoint(BaseModel):
    lat: float
    lon: float
    weight: float


class ConstructionPermitFeature(BaseModel):
    id: int
    lat: float
    lon: float
    value: float
    permit_type: str
    issued_date: date


class VisitorTrendPoint(BaseModel):
    month: date
    residents: int
    commuters: int
    visitors: int


class VisitorOriginPoint(BaseModel):
    month: date
    region: str
    visitors: int


class TopLocationCategory(BaseModel):
    month: date
    category: str
    visits: int


class AdvisorQueryRequest(BaseModel):
    question: str = Field(..., alias="query", description="User question for the advisor.")
    lat: Optional[float] = None
    lon: Optional[float] = None
    address: Optional[str] = None


class AdvisorQueryResponse(BaseModel):
    answer: str
    score: Optional[float] = None
    grade: Optional[str] = None
    raw_metrics: Optional[Dict[str, Any]] = None


class JobSummary(BaseModel):
    total_jobs: int
    jobs_this_month: int
    top_industry: str
    top_skill: str


class JobTrendPoint(BaseModel):
    month: str
    postings: int


class JobSkillDemand(BaseModel):
    skill: str
    count: int


class JobListing(BaseModel):
    job_title: str
    company: str
    industry: str
    salary: str
    location: str
    posting_date: date
    skills: List[str]


