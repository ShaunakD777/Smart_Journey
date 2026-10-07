import os
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv


env_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
load_dotenv(env_path)

# Initialize the FastMCP server instance
mcp = FastMCP("TripPlannerTools")
