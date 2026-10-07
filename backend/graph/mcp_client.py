import os
import sys

# MultiServerMCPClient is the standard LangChain interface for connecting to MCP servers.
from langchain_mcp_adapters.client import MultiServerMCPClient

def get_mcp_client() -> MultiServerMCPClient:
    """
    Initializes and returns a MultiServerMCPClient instance configured for stdio connection
    to the local python MCP server.
    """
    # Define the absolute path to the MCP server main.py
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    server_path = os.path.join(base_dir, "mcp_trip_server", "main.py")

    connections = {
        "TripPlannerTools": {
            "transport": "stdio",
            "command": sys.executable,
            "args": [server_path]
        }
    }
    
    return MultiServerMCPClient(connections)

