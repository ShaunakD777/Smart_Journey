"""
Pydantic schemas for API request/response validation and
as the shared data contract between agents.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime


# ── Trip Request (input) ─────────────────────────────────────────────────────

class TripRequest(BaseModel):
    """Parsed representation of the user's natural-language trip query."""
    raw_query: str
    is_travel_related: bool = Field(default=True, description="False if the query is completely unrelated to travel/vacations.")
    destination: Optional[str] = Field(None, max_length=100)
    origin: Optional[str] = Field(None, max_length=100)
    duration_days: Optional[int] = Field(None, gt=0)
    travel_month: Optional[str] = Field(None, max_length=20)
    num_travelers: Optional[int] = Field(None, gt=0)
    budget_inr: Optional[float] = Field(None, gt=0)
    interests: list[str] = Field(default_factory=list, max_length=20)
    avoid: list[str] = Field(default_factory=list, max_length=20)
    extra_notes: str = Field(default="", max_length=1000)


class PlanTripRequest(BaseModel):
    """Payload accepted by POST /api/plan"""
    query: str = Field(..., max_length=2000, description="Natural language trip planning request")


# ── Agent Output Schemas ──────────────────────────────────────────────────────

class FlightInfo(BaseModel):
    recommended_routes: list[str] = Field(default_factory=list)
    estimated_cost_inr: float = 0.0
    airlines: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)


class HotelInfo(BaseModel):
    recommendations: list[dict] = Field(default_factory=list)
    estimated_total_cost_inr: float = 0.0
    tips: list[str] = Field(default_factory=list)


class WeatherInfo(BaseModel):
    summary: str = ""
    monthly_overview: str = ""
    daily_forecast: list[str] = Field(default_factory=list)
    rain_probability: str = ""
    packing_tips: list[str] = Field(default_factory=list)


class FoodInfo(BaseModel):
    must_try_dishes: list[str] = Field(default_factory=list)
    restaurant_recommendations: list[dict] = Field(default_factory=list)
    estimated_daily_food_cost_inr: float = 0.0
    food_tips: list[str] = Field(default_factory=list)


class ItineraryDay(BaseModel):
    day: int
    date_note: str = ""
    city: str = ""
    morning: str = ""
    afternoon: str = ""
    evening: str = ""
    estimated_cost_inr: float = 0.0
    highlights: list[dict] = Field(default_factory=list)


class ItineraryInfo(BaseModel):
    days: list[ItineraryDay] = Field(default_factory=list)
    rain_alternative_plan: str = ""
    general_tips: list[str] = Field(default_factory=list)


class RouteInfo(BaseModel):
    optimal_city_order: list[str] = Field(default_factory=list)
    transport_between_cities: list[dict] = Field(default_factory=list)
    local_transport_tips: list[str] = Field(default_factory=list)
    google_maps_link: str = ""


class BudgetInfo(BaseModel):
    total_budget_inr: float = 0.0
    breakdown: dict[str, float] = Field(default_factory=dict)
    per_person_per_day_inr: float = 0.0
    savings_tips: list[str] = Field(default_factory=list)
    is_feasible: bool = True
    feasibility_note: str = ""


class CurrencyInfo(BaseModel):
    dest_currency_code: str = ""

    inr_to_dest_rate: float = 0.0
    budget_in_dest_currency: float = 0.0
    daily_budget_dest_currency: float = 0.0

    useful_conversions: dict[str, str] = Field(default_factory=dict)
    payment_tips: list[str] = Field(default_factory=list)


class VisaInfo(BaseModel):
    visa_required: bool = True
    visa_type: str = ""
    application_steps: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    processing_time: str = ""
    estimated_fee_inr: float = 0.0
    embassy_link: str = ""


# ── Final Plan ────────────────────────────────────────────────────────────────

class TripPlanContent(BaseModel):
    """The plan sections produced by the Compiler agent."""
    flights: FlightInfo = Field(default_factory=FlightInfo)
    hotels: HotelInfo = Field(default_factory=HotelInfo)
    weather: WeatherInfo = Field(default_factory=WeatherInfo)
    food: FoodInfo = Field(default_factory=FoodInfo)
    itinerary: ItineraryInfo = Field(default_factory=ItineraryInfo)
    route: RouteInfo = Field(default_factory=RouteInfo)
    budget: BudgetInfo = Field(default_factory=BudgetInfo)
    currency: CurrencyInfo = Field(default_factory=CurrencyInfo)
    visa: VisaInfo = Field(default_factory=VisaInfo)
    packing_list: list[str] = Field(default_factory=list)
    tourist_attractions: list[dict] = Field(default_factory=list)


class TripPlan(TripPlanContent):
    """A complete plan as returned by the API."""
    session_id: str
    request: TripRequest


# ── API Response Wrappers ─────────────────────────────────────────────────────

class PlanTripResponse(BaseModel):
    session_id: str
    status: str
    message: str


class GetPlanResponse(BaseModel):
    session_id: str
    status: str
    phase: Optional[int] = None
    plan: Optional[TripPlan] = None
    error: Optional[str] = None


# ── Auth ──────────────────────────────────────────────────────────────────────

PASSWORD_MIN_LENGTH = 8


class UserCreate(BaseModel):
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=128)

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: UUID
    email: str
    settings: dict = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
