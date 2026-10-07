import logging
import json
from typing import Literal
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END

from graph.state import GraphState
from utils.query_parser import QueryParser
from utils.model_router import get_react_llm
from graph.mcp_client import get_mcp_client
from agents.react_workers import create_logistics_agent, create_local_expert_agent, create_memory_agent
from models.schemas import TripPlanContent

logger = logging.getLogger(__name__)

AGENT_NODES = ["Supervisor", "Logistics_Agent", "Local_Expert_Agent", "Memory_Agent", "Compiler_Agent"]


class SupervisorResponse(BaseModel):
    next_agent: Literal["Logistics_Agent", "Local_Expert_Agent", "Memory_Agent", "FINISH"]


def supervisor_node(state: GraphState) -> dict:
    """
    Supervisor node that dynamically routes work based on user intent
    and current agent progress.
    """
    llm = get_react_llm("supervisor")
    structured_llm = llm.with_structured_output(SupervisorResponse)

    completed = state.get("completed_agents", [])
    raw_query = state.get("request").raw_query if state.get("request") else "N/A"

    # Context summaries extracted from state
    logistics_summary = state.get("logistics_summary", "Not run yet.")
    local_expert_summary = state.get("local_expert_summary", "Not run yet.")
    memory_summary = state.get("memory_summary", "Not run yet.")

    system_prompt = (
        "You are the Smart Journey Supervisor orchestrating a multi-agent team.\n"
        "Your job is to analyze the user's travel request and decide which worker agent to call next, "
        "or return 'FINISH' if sufficient information has been gathered.\n\n"

        "AVAILABLE AGENTS:\n"
        "- Logistics_Agent: Handles flights, routes, transit options, currency, and travel requirements.\n"
        "- Local_Expert_Agent: Handles hotels, restaurants, local attractions, daily itineraries, and weather.\n"
        "- Memory_Agent: Recalls similar past trips from the vector database for reusable ideas and tips.\n\n"

        "ROUTING RULES:\n"
        "1. DO NOT call an agent if it has already completed its task unless explicitly required.\n"
        "2. Choose agents based ONLY on what the user query actually requests. Do not call irrelevant agents.\n"
        "3. Return 'FINISH' as soon as all necessary information requested by the user is retrieved.\n"
    )

    context_prompt = (
        f"USER REQUEST: \"{raw_query}\"\n\n"
        f"CURRENT PROGRESS:\n"
        f"- Completed Agents: {', '.join(completed) if completed else 'None'}\n"
        f"- Logistics Summary: {logistics_summary}\n"
        f"- Local Expert Summary: {local_expert_summary}\n"
        f"- Memory Summary: {memory_summary}\n\n"
        "Based on the request and current progress, select the single best next agent or return 'FINISH'."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context_prompt}
    ]

    try:
        response = structured_llm.invoke(messages)
        next_agent = response.next_agent
    except Exception as e:
        logger.error(f"[supervisor] Structured output failed: {e}")
        next_agent = "FINISH"

    logger.info(f"[supervisor] completed={completed} next={next_agent}")
    return {"next_agent_to_call": next_agent}


def _sse(event_type: str, agent: str, message: str) -> str:
    return f"data: {json.dumps({'type': event_type, 'agent': agent, 'message': message})}\n\n"


async def stream_trip_plan(raw_query: str, session_id: str, state_container: dict = None, ai_model_override: str = None):
    """
    Runs the LangGraph pipeline and yields its progress as Server-Sent Events.
    The parsed request and the compiled plan are written into `state_container`.
    """
    logger.info(f"[pipeline] Starting graph stream for session {session_id}")

    trip_request = QueryParser().parse(raw_query)

    if not trip_request.is_travel_related:
        raise ValueError("This prompt does not seem related to travel planning. Please describe the trip you'd like to take!")

    missing_fields = []
    if not trip_request.origin: missing_fields.append("Origin")
    if not trip_request.destination: missing_fields.append("Destination")
    if not trip_request.duration_days: missing_fields.append("Duration")
    if not trip_request.budget_inr: missing_fields.append("Budget")
    if not trip_request.num_travelers: missing_fields.append("Number of travelers")
    if not trip_request.travel_month: missing_fields.append("Travel month")

    if missing_fields:
        raise ValueError(f"Missing required information: {', '.join(missing_fields)}. Please provide these details so I can plan your trip.")

    if state_container is not None:
        state_container["request"] = trip_request

    all_tools = await get_mcp_client().get_tools()

    logistics_agent = create_logistics_agent(all_tools, ai_model_override)
    local_expert_agent = create_local_expert_agent(all_tools, ai_model_override)
    memory_agent = create_memory_agent(all_tools, ai_model_override)

    trip_context = f"User Query: {raw_query}\nTrip Details:\n{trip_request.model_dump_json()}\n"

    async def run_worker(name: str, agent, context: str) -> str:
        """Run a worker agent and return its final summary, retrying once if the LLM replies empty."""
        logger.info(f"[{name}] Starting...")
        for attempt in range(2):
            result = await agent.ainvoke({"messages": [HumanMessage(content=context)]})
            summary = result["messages"][-1].content
            if summary and str(summary).strip():
                return summary
            logger.warning(f"[{name}] Empty response (attempt {attempt + 1}).")
        return "[Notice: This agent returned no findings.]"

    async def logistics_node(state: GraphState):
        summary = await run_worker("Logistics_Agent", logistics_agent, trip_context)
        return {"logistics_summary": summary, "completed_agents": ["Logistics_Agent"]}

    async def local_expert_node(state: GraphState):
        context = trip_context
        if state.get("logistics_summary"):
            context += f"\n[Logistics Agent findings]\n{state['logistics_summary']}"
        summary = await run_worker("Local_Expert_Agent", local_expert_agent, context)
        return {"local_expert_summary": summary, "completed_agents": ["Local_Expert_Agent"]}

    async def memory_node(state: GraphState):
        summary = await run_worker("Memory_Agent", memory_agent, trip_context)
        return {"memory_summary": summary, "completed_agents": ["Memory_Agent"]}

    async def compiler_node(state: GraphState):
        logger.info("[Compiler_Agent] Starting...")
        context = trip_context
        context += f"\n[Logistics Agent findings]\n{state.get('logistics_summary', '')}\n"
        context += f"\n[Local Expert Agent findings]\n{state.get('local_expert_summary', '')}\n"
        context += f"\n[Memory Agent findings]\n{state.get('memory_summary', '')}\n"

        structured_llm = get_react_llm("supervisor").with_structured_output(TripPlanContent)

        system_prompt = (
            "You are the JSON Compiler Agent.\n"
            "Your job is to read all the agent summaries provided in the context and convert them "
            "into a perfectly structured JSON object matching the requested schema.\n"
            "Do NOT make up information. Extract the prices, names, and tips exactly as the agents reported them."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context}
        ]

        try:
            final_plan = await structured_llm.ainvoke(messages)
            return {field: getattr(final_plan, field) for field in TripPlanContent.model_fields}
        except Exception as e:
            logger.error(f"[Compiler_Agent] Failed: {e}")
            return {}

    def route_from_supervisor(state: GraphState):
        next_agent = state.get("next_agent_to_call", "FINISH")
        return "Compiler_Agent" if next_agent == "FINISH" else next_agent

    workflow = StateGraph(GraphState)

    workflow.add_node("Supervisor", supervisor_node)
    workflow.add_node("Logistics_Agent", logistics_node)
    workflow.add_node("Local_Expert_Agent", local_expert_node)
    workflow.add_node("Memory_Agent", memory_node)
    workflow.add_node("Compiler_Agent", compiler_node)

    workflow.add_edge(START, "Supervisor")
    workflow.add_conditional_edges(
        "Supervisor",
        route_from_supervisor,
        {
            "Logistics_Agent": "Logistics_Agent",
            "Local_Expert_Agent": "Local_Expert_Agent",
            "Memory_Agent": "Memory_Agent",
            "Compiler_Agent": "Compiler_Agent"
        }
    )

    # All workers report back to the supervisor; the compiler ends the run
    workflow.add_edge("Logistics_Agent", "Supervisor")
    workflow.add_edge("Local_Expert_Agent", "Supervisor")
    workflow.add_edge("Memory_Agent", "Supervisor")
    workflow.add_edge("Compiler_Agent", END)

    app = workflow.compile()

    initial_state = {
        "session_id": session_id,
        "request": trip_request,
        "completed_agents": [],
        "status": "running"
    }

    current_agent = "Supervisor"
    # Run ids of tool calls already reported. Wrapped tools (see wrap_tool_for_compression)
    # emit a nested tool event for the inner MCP tool, which is skipped to avoid duplicates.
    active_tool_runs = set()

    async for event in app.astream_events(initial_state, version="v2"):
        kind = event["event"]
        name = event["name"]

        # Detect node transitions to track the current active agent
        if kind == "on_chain_start" and name in AGENT_NODES:
            current_agent = name
            yield _sse("routing", "System", f"Routing to {name}...")
            if name == "Compiler_Agent":
                yield _sse("routing", "Compiler_Agent", "Generating structured JSON from agent findings...")

        # Capture compiler output
        if kind == "on_chain_end" and name == "Compiler_Agent":
            output = event["data"].get("output") or {}
            if state_container is not None:
                state_container.update(output)
            if output:
                yield _sse("thought", "Compiler_Agent", "Successfully generated and validated structured JSON trip plan!")

        # Stream LLM tokens
        elif kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                yield _sse("thought", current_agent, content)

        elif kind == "on_tool_start":
            if active_tool_runs.intersection(event.get("parent_ids", [])):
                continue
            active_tool_runs.add(event["run_id"])
            tool_args = event["data"].get("input", {})
            yield _sse("tool", current_agent, f"Calling tool: {name} with {json.dumps(tool_args)}")

        elif kind == "on_tool_end" and event["run_id"] in active_tool_runs:
            active_tool_runs.discard(event["run_id"])
            yield _sse("tool_end", current_agent, f"Tool {name} finished.")
