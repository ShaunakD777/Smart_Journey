import os
import weaviate
from server import mcp


@mcp.tool()
def search_past_itineraries(query: str, limit: int = 3) -> str:
    """
    Perform a semantic search over past itineraries using Weaviate vector database.
    
    This tool should be used by the LLM to recall past trip plans that match a user's 
    interests, destination, or travel style, allowing the agent to reuse successful templates 
    or recommend proven itineraries.
    
    Args:
        query: The natural language search query (e.g., 'budget backpacking trip to Southeast Asia').
        limit: Maximum number of past itineraries to return (default is 3).
        
    Returns:
        A formatted string summarizing the most relevant past trips, or an error message.
    """
    weaviate_url = os.getenv("WEAVIATE_URL", "http://localhost:8080")
    
    try:
        client = weaviate.connect_to_local(
            host=weaviate_url.split("://")[-1].split(":")[0],
            port=int(weaviate_url.split(":")[-1].strip("/")) if ":" in weaviate_url.split("://")[-1] else 8080
        )
        
        try:
            collection = client.collections.get("TripMemory")
            
            results = collection.query.near_text(
                query=query,
                limit=limit,
                return_properties=["session_id", "destination", "travel_month", "plan_summary"]
            )
            
            if not results.objects:
                return f"No similar past trips found for query: '{query}'"
                
            summaries = []
            for i, obj in enumerate(results.objects):
                props = obj.properties
                dest = props.get("destination", "Unknown")
                month = props.get("travel_month", "Unknown")
                summary = props.get("plan_summary", "No summary available.")
                summaries.append(f"Match {i+1} - Destination: {dest} ({month})\nSummary: {summary}")
                
            return "\n\n".join(summaries)
            
        finally:
            client.close()
            
    except Exception as e:
        return f"Weaviate search error: {str(e)}"
