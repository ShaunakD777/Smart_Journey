import os
import requests
from server import mcp

@mcp.tool()
def search_flights(departure_airport: str, arrival_airport: str, travel_month: str, duration_days: int) -> str:
    """
    Look up real-time flight prices and options using the SerpApi Google Flights engine.
    
    This tool provides real pricing data. Because exact dates aren't always provided by the user, 
    this tool automatically constructs a "dummy date" in the middle of the requested travel_month 
    to fetch realistic proxy prices.
    
    Args:
        departure_airport: IATA code for the departure airport (e.g., 'DEL', 'JFK').
        arrival_airport: IATA code for the arrival airport (e.g., 'NRT', 'CDG').
        travel_month: The month of travel (e.g., 'October').
        duration_days: The length of the trip in days (e.g., 5).
        
    Returns:
        A string containing real flight options including airline, price, and duration.
    """
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        return "Error: SERPAPI_KEY is not configured on the server."
        
    import datetime
    
    # 1. Parse the month and construct dummy dates
    try:
        month_num = datetime.datetime.strptime(travel_month[:3], "%b").month
    except Exception:
        # Fallback to current month if parsing fails
        month_num = datetime.datetime.now().month

    year = datetime.datetime.now().year
    if month_num < datetime.datetime.now().month:
        year += 1 # Next year
        
    # Start on the 15th of the month
    outbound_date = datetime.date(year, month_num, 15)
    return_date = outbound_date + datetime.timedelta(days=duration_days)
    
    params = {
        "engine": "google_flights",
        "departure_id": departure_airport.upper(),
        "arrival_id": arrival_airport.upper(),
        "outbound_date": outbound_date.strftime("%Y-%m-%d"),
        "return_date": return_date.strftime("%Y-%m-%d"),
        "currency": "INR",
        "hl": "en",
        "type": "1", # round trip
        "api_key": api_key
    }
    
    try:
        response = requests.get("https://serpapi.com/search.json", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        best_flights = data.get("best_flights", [])
        if not best_flights:
            return f"No flights found from {departure_airport} to {arrival_airport} for {travel_month}."
            
        results = [f"Proxy Flight Estimates for {travel_month} (Dates used: {outbound_date} to {return_date}):"]
        for i, f in enumerate(best_flights[:3]):
            flights_info = f.get("flights", [{}])[0]
            airline = flights_info.get("airline", "Unknown Airline")
            price = f.get("price", "Price unknown")
            duration = f.get("total_duration", 0)
            
            results.append(f"{i+1}. {airline} - Round Trip Price: {price} INR - Duration: {duration} mins")
            
        return "\n".join(results)
        
    except Exception as e:
        return f"Error executing Google Flights search: {str(e)}"

@mcp.tool()
def convert_currency(target_currency: str) -> str:
    """
    Convert INR to a target fiat currency using the ExchangeRate-API.
    
    This tool should be used by the LLM (Budget/Currency agent) to convert Indian Rupees (INR) 
    into the local currency of the travel destination, ensuring accurate budget calculations.
    
    Args:
        target_currency: The ISO 3-letter currency code to convert INR into (e.g., 'JPY', 'EUR', 'USD').
        
    Returns:
        A string stating the conversion rate (e.g., '1 INR = 1.83 JPY'), or an error message.
    """
    target_currency = target_currency.upper()
    if target_currency == "INR":
        return "1 INR = 1.00 INR"
        
    def _fallback_exchangerate():
        fallback_key = os.getenv("EXCHANGE_RATE_API_KEY")
        if not fallback_key:
            return "Error: Both Fixer API failed and EXCHANGE_RATE_API_KEY is missing."
        try:
            url = f"https://v6.exchangerate-api.com/v6/{fallback_key}/pair/INR/{target_currency}"
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
            if data.get("result") == "error":
                return f"ExchangeRate API error: {data.get('error-type', 'Unknown')}"
            rate = data.get("conversion_rate")
            return f"1 INR = {rate} {target_currency} (Fallback: ExchangeRate-API)"
        except Exception as e:
            return f"Error: Both APIs failed. Fixer limit reached, ExchangeRate error: {str(e)}"

    api_key = os.getenv("FIXER_API_KEY")
    if not api_key:
        return _fallback_exchangerate()

    try:
        # Fixer API free tier uses EUR as the base currency.
        url = "http://data.fixer.io/api/latest"
        params = {
            "access_key": api_key,
            "symbols": f"INR,{target_currency}"
        }
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 403 or response.status_code == 429:
            return _fallback_exchangerate()
            
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            # specific fixer error code 104 is usage limit reached
            return _fallback_exchangerate()
            
        rates = data.get("rates", {})
        if "INR" not in rates or target_currency not in rates:
            return _fallback_exchangerate()
            
        inr_rate = rates["INR"]
        target_rate = rates[target_currency]
        
        rate = round(target_rate / inr_rate, 6)
        return f"1 INR = {rate} {target_currency}"
        
    except Exception:
        # On any network or parsing error, fallback
        return _fallback_exchangerate()
