"""
Weaviate memory utilities.
Stores completed trip plans as vector embeddings so the Memory agent
(via the MCP `search_past_itineraries` tool) can recall similar trips.
"""

import logging
from database import get_weaviate_client
from models.schemas import TripPlan

logger = logging.getLogger(__name__)


def store_trip_memory(plan: TripPlan) -> bool:
    """
    Embed and store a completed trip plan in Weaviate.
    Returns True on success.
    """
    try:
        client = get_weaviate_client()
        collection = client.collections.get("TripMemory")

        # Build a searchable text summary for vectorisation
        plan_summary = f"""
Trip to {plan.request.destination} in {plan.request.travel_month}.
{plan.request.duration_days} days, {plan.request.num_travelers} travelers.
Interests: {', '.join(plan.request.interests)}.
Budget: ₹{plan.request.budget_inr:,.0f}.
Cities: {', '.join(plan.route.optimal_city_order) if plan.route.optimal_city_order else plan.request.destination}.
""".strip()

        collection.data.insert({
            "session_id": plan.session_id,
            "destination": plan.request.destination,
            "travel_month": plan.request.travel_month,
            "interests": ", ".join(plan.request.interests),
            "duration_days": plan.request.duration_days,
            "budget_inr": plan.request.budget_inr,
            "plan_summary": plan_summary,
            "full_plan_json": plan.model_dump_json(),
        })

        logger.info(f"[Memory] Stored trip plan {plan.session_id} in Weaviate.")
        return True

    except Exception as e:
        logger.warning(f"[Memory] Failed to store trip in Weaviate: {e}")
        return False

