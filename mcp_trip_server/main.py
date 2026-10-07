from server import mcp

# Importing these modules will trigger the @mcp.tool() decorators,
# registering the functions with the centralized 'mcp' instance.
import web_tools
import travel_tools
import db_tools

if __name__ == "__main__":
    # Run the server over standard input/output (stdio) for local agent communication
    mcp.run()
