"""
LangGraph state definition.
The GraphState dict is passed between all nodes in the graph.
Each agent reads what it needs and writes its result back.
"""

from typing import Optional, TypedDict, Annotated
import operator

from models.schemas import (
    TripRequest, FlightInfo, HotelInfo, WeatherInfo, FoodInfo,
    ItineraryInfo, RouteInfo, BudgetInfo, CurrencyInfo, VisaInfo
)

class GraphState(TypedDict, total=False):
    # ── Input ──────────────────────────────────────────────────────────────
    session_id: str
    request: TripRequest

    # ── Agent Summaries (Isolated Context) ─────────────────────────────────
    logistics_summary: str
    local_expert_summary: str
    memory_summary: str

    # ── Agent outputs ──────────────────────────────────────────────────────
    flights: Optional[FlightInfo]
    hotels: Optional[HotelInfo]
    weather: Optional[WeatherInfo]
    food: Optional[FoodInfo]
    itinerary: Optional[ItineraryInfo]
    route: Optional[RouteInfo]
    budget: Optional[BudgetInfo]
    currency: Optional[CurrencyInfo]
    visa: Optional[VisaInfo]

    # ── Derived outputs ────────────────────────────────────────────────────
    packing_list: list[str]
    tourist_attractions: list[dict]

    # ── Flow control ──────────────────────────────────────────────────────
    status: str   # "running" | "done" | "error"
    completed_agents: Annotated[list[str], operator.add]
    next_agent_to_call: str
