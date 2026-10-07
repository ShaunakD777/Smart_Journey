from typing import List, Any
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import StructuredTool

from utils.model_router import get_react_llm

def wrap_tool_for_compression(tool: Any) -> Any:
    """Wraps an MCP tool to compress its output and prevent context bloat."""
    if tool.name not in ["search_flights", "search_google_local", "search_past_itineraries"]:
        return tool
        
    def compress(output: Any) -> str:
        output_str = str(output)
        if tool.name == "search_flights":
            if output_str.startswith("No flights found"):
                return output_str + "\n[CRITICAL: DO NOT call search_flights for this route again. Proceed using general estimates.]"

            # Keep the header line plus the top 3 flights
            lines = [line for line in output_str.split('\n') if line.strip()]
            if len(lines) > 4:
                return '\n'.join(lines[:4]) + "\n[Note: Additional flights truncated to save context]"
        elif tool.name == "search_google_local":
            # For google local, truncate to around 800 chars to fit ~3 businesses
            if len(output_str) > 800:
                return output_str[:800] + "...\n[Note: Additional results truncated to save context]"
        elif tool.name == "search_past_itineraries":
            if "Weaviate search error" in output_str:
                return output_str + "\n[CRITICAL INSTRUCTION: THE DATABASE IS UNAVAILABLE. DO NOT RETRY THIS TOOL. PROCEED USING YOUR INTERNAL KNOWLEDGE.]"
        return output_str
        
    async def new_arun(**kwargs):
        res = await tool.ainvoke(kwargs)
        # LangChain tools return AIMessage or strings, handle safely
        if hasattr(res, "content"):
            res = res.content
        return compress(res)

    def new_run(**kwargs):
        res = tool.invoke(kwargs)
        if hasattr(res, "content"):
            res = res.content
        return compress(res)

    return StructuredTool(
        name=tool.name,
        description=tool.description,
        args_schema=tool.args_schema,
        func=new_run,
        coroutine=new_arun,
    )

def get_filtered_tools(all_tools: List[Any], tool_names: List[str]) -> List[Any]:
    """Helper to filter the complete MCP toolset down to specific tools for each agent."""
    filtered = [t for t in all_tools if hasattr(t, "name") and t.name in tool_names]
    return [wrap_tool_for_compression(t) for t in filtered]

COMMON_INSTRUCTION = (
    "You must use your provided tools to gather real-time data before answering. "
    "If a tool returns an error or fails, DO NOT RETRY THE TOOL. You must immediately and explicitly state "
    "'[Notice: Live data fetch failed for <tool_name>, falling back to general knowledge]' "
    "in your output, and then proceed to answer using your internal knowledge.\n"
    "CRITICAL: Your final response MUST be a highly detailed, structured text summary of all the data you found. "
    "Other agents will ONLY see this final text summary, not your raw tool outputs! Ensure all necessary data (prices, names, etc.) is included."
)

def create_logistics_agent(all_mcp_tools: List[Any], ai_model_override: str = None):
    """
    Creates the Logistics Agent.
    Responsible for flights, transportation routes, and fiat currency conversions.
    """
    tools = get_filtered_tools(all_mcp_tools, ["search_flights", "convert_currency"])
    llm = get_react_llm("logistics", ai_model_override)
    
    system_prompt = (
        "You are the Travel Logistics Expert.\n"
        "Your role is to plan transportation routes, check flight schedules, and handle "
        "accurate fiat currency conversions for budget planning.\n\n"
        "CRITICAL INSTRUCTION: First, use your geographic knowledge to determine if flights are logical for this route. "
        "If the origin and destination are close (e.g., within driving or train distance like Mumbai to Pune), "
        "DO NOT use `search_flights`; instead, rely on your internal knowledge to suggest ground transport. "
        "Only execute `search_flights` if flying is the practical option.\n\n"
        "If you do decide to search for flights and currency adjustments are also required, you MUST execute "
        "`search_flights` and `convert_currency` in parallel within the same turn.\n\n"
        "CRITICAL FOR FLIGHTS: You MUST search for flights to the EXACT destination city provided by the user (e.g., if the user says Pune, search for Pune/PNQ). DO NOT substitute it with a nearby 'major' airport (like Mumbai/BOM) unless the user explicitly asks you to. If the user provides a country as the destination (e.g., 'Japan'), only then should you default to the capital or largest major airport.\n"
        "CRITICAL FOR FLIGHTS: When calling `search_flights`, you MUST pass the `travel_month` and `duration_days` found in the user's Trip Details.\n\n"
        f"{COMMON_INSTRUCTION}"
    )
    
    return create_react_agent(llm, tools, prompt=system_prompt)


def create_local_expert_agent(all_mcp_tools: List[Any], ai_model_override: str = None):
    """
    Creates the Local Expert Agent.
    Responsible for local places, hotels, food recommendations, and live weather.
    """
    tools = get_filtered_tools(all_mcp_tools, ["search_google_local", "fetch_typical_weather"])
    llm = get_react_llm("local_expert", ai_model_override)
    
    system_prompt = (
        "You are the Local Destination Expert.\n"
        "Your role is to find highly-rated local businesses (hotels, restaurants, attractions) using search tools, "
        "and provide accurate typical weather conditions for the user's travel month to advise on packing and daily scheduling.\n\n"
        "CRITICAL FIRST TURN INSTRUCTION:\n"
        "In your VERY FIRST turn, you MUST invoke ALL THREE of these tool calls simultaneously (parallel):\n"
        "  1. `fetch_typical_weather` for the destination and travel month.\n"
        "  2. `search_google_local` with query 'budget hotels' (or similar) and the destination.\n"
        "  3. `search_google_local` with query 'best restaurants' (or similar) and the destination.\n"
        "Do NOT wait for one result before calling the next. Call all three tools in a single turn.\n\n"
        "CRITICAL FOR HOTELS AND FOOD:\n"
        "You MUST provide the exact names, ratings, and estimated prices of at least 2 specific hotels and 2 specific restaurants. "
        "DO NOT output generic categories like 'Luxury Hotels' or 'Local vegetarian restaurants'. You must name specific real-world establishments (e.g., 'Taj Mahal Palace'). "
        "If your search tool fails and you fall back to general knowledge, you must STILL provide specific names and estimated prices from your knowledge.\n\n"
        f"{COMMON_INSTRUCTION}"
    )
    
    return create_react_agent(llm, tools, prompt=system_prompt)


def create_memory_agent(all_mcp_tools: List[Any], ai_model_override: str = None):
    """
    Creates the Memory Agent.
    Responsible for recalling similar past trips from the Weaviate vector store.
    """
    tools = get_filtered_tools(all_mcp_tools, ["search_past_itineraries"])
    llm = get_react_llm("memory", ai_model_override)

    system_prompt = (
        "You are the Trip Memory Agent.\n"
        "Your role is to recall similar trips planned in the past so the team can reuse what worked.\n\n"
        "Call `search_past_itineraries` ONCE with a short query describing the destination, travel style and interests. "
        "Then summarise any relevant matches (destinations, durations, budgets and highlights) and the ideas worth reusing. "
        "If there are no matches, say so in one sentence and add a few practical tips for this trip from your own knowledge.\n\n"
        f"{COMMON_INSTRUCTION}"
    )

    return create_react_agent(llm, tools, prompt=system_prompt)
