import os
import requests
from server import mcp

@mcp.tool()
def search_google_local(query: str, location: str) -> str:
    """
    Search the Google Local Pack using the SerpAPI google_local engine.
    
    This tool should be used by the LLM when it needs to find real, highly-rated 
    local businesses (like hotels, restaurants, or attractions) in a specific city or area.
    
    Args:
        query: The search query (e.g., 'budget hotels', 'sushi restaurants').
        location: The location to search in (e.g., 'Tokyo, Japan', 'Paris, France').
        
    Returns:
        A formatted string containing the top local results with names, ratings, 
        addresses, and prices (if available), or an error message if the search fails.
    """
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        return "Error: SERPAPI_KEY is not configured on the server."
        
    params = {
        "engine": "google_local",
        "q": query,
        "location": location,
        "api_key": api_key,
        "hl": "en",
        "gl": "us"
    }
    
    try:
        response = requests.get("https://serpapi.com/search.json", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        local_results = data.get("local_results", [])
        if not local_results:
            return f"No local results found for '{query}' in '{location}'."
            
        results = []
        for i, place in enumerate(local_results[:5]):
            name = place.get("title", "Unknown Name")
            rating = place.get("rating", "N/A")
            reviews = place.get("reviews", 0)
            address = place.get("address", "No address provided")
            price = place.get("price", "N/A")
            
            results.append(f"{i+1}. {name} (Rating: {rating} from {reviews} reviews)\n   Address: {address}\n   Price: {price}")
            
        return "\n\n".join(results)
        
    except requests.exceptions.RequestException as e:
        return f"Error executing SerpAPI request: {str(e)}"
    except Exception as e:
        return f"Unexpected error during local search: {str(e)}"

@mcp.tool()
def fetch_typical_weather(location: str, travel_month: str) -> str:
    """
    Fetch historical typical weather data (averages) for a specific month using the Open-Meteo archive API.
    
    This tool should be used by the LLM to get real historical averages (temperature, precipitation) 
    for a destination during the user's travel month, rather than relying on general knowledge.
    
    Args:
        location: The name of the city/location (e.g., 'Tokyo, Japan').
        travel_month: The full name of the month (e.g., 'October').
        
    Returns:
        A formatted string containing the average temperature and total precipitation 
        for that month, based on historical data.
    """
    try:
        from geopy.geocoders import Nominatim
        import datetime
        
        # 1. Geocode the location
        geolocator = Nominatim(user_agent="trip_planner_bot")
        loc_data = geolocator.geocode(location)
        if not loc_data:
            return f"Error: Could not find geographic coordinates for '{location}'."
            
        lat = loc_data.latitude
        lon = loc_data.longitude
        
        # 2. Determine dates for the previous year
        try:
            month_num = datetime.datetime.strptime(travel_month.strip()[:3].title(), "%b").month
        except ValueError:
            return f"Error: '{travel_month}' is not a valid month name."
            
        # Use last year's data as a proxy for "typical"
        year = datetime.datetime.now().year - 1
        
        # Get start and end dates of the month
        import calendar
        _, last_day = calendar.monthrange(year, month_num)
        start_date = f"{year}-{month_num:02d}-01"
        end_date = f"{year}-{month_num:02d}-{last_day:02d}"
        
        # 3. Query Open-Meteo Archive API
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "temperature_2m_mean,precipitation_sum",
            "timezone": "auto"
        }
        
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        daily = data.get("daily", {})
        temps = daily.get("temperature_2m_mean", [])
        precips = daily.get("precipitation_sum", [])
        
        # Filter out None values
        valid_temps = [t for t in temps if t is not None]
        valid_precips = [p for p in precips if p is not None]
        
        if not valid_temps:
            return f"No historical temperature data available for {location} in {travel_month}."
            
        avg_temp = sum(valid_temps) / len(valid_temps)
        total_precip = sum(valid_precips)
        
        return (
            f"Historical Typical Weather for {location} in {travel_month} (Based on {year} data):\n"
            f"- Average Temperature: {avg_temp:.1f}°C\n"
            f"- Total Precipitation for the month: {total_precip:.1f} mm"
        )
        
    except Exception as e:
        return f"Unexpected error during historical weather fetch: {str(e)}"
