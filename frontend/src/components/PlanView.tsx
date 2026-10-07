import { useTrip } from '../context/TripContext'
import { BASE_URL } from '../api'
import { ErrorBoundary } from './ErrorBoundary'
import FlightSection from './sections/FlightSection'
import HotelSection from './sections/HotelSection'
import WeatherSection from './sections/WeatherSection'
import FoodSection from './sections/FoodSection'
import ItinerarySection from './sections/ItinerarySection'
import BudgetSection from './sections/BudgetSection'
import CurrencySection from './sections/CurrencySection'
import VisaSection from './sections/VisaSection'

interface PlanViewProps {
  onShowPackingList?: () => void
}

// Helpers to determine if a section actually has content to render
const hasBudget = (b: any) => b && (Object.keys(b.breakdown || {}).length > 0 || (b.savings_tips || []).length > 0 || b.feasibility_note);
const hasFlights = (f: any) => f && ((f.airlines || []).length > 0 || (f.recommended_routes || []).length > 0 || (f.tips || []).length > 0 || f.estimated_cost_inr > 0);
const hasHotels = (h: any) => h && h.recommendations && h.recommendations.length > 0;
const hasVisa = (v: any) => v && (v.requirements || v.visa_type || v.estimated_cost_inr > 0 || (v.required_documents || []).length > 0);
const hasItinerary = (i: any) => i && (i.days || []).length > 0;
const hasFood = (f: any) => f && ((f.restaurant_recommendations || []).length > 0 || (f.must_try_dishes || []).length > 0 || (f.food_tips || []).length > 0);
const hasCurrency = (c: any) => c && (c.inr_to_dest_rate > 0 || c.inr_to_jpy_rate > 0 || Object.keys(c.useful_conversions || {}).length > 0 || (c.payment_tips || []).length > 0);
const hasWeather = (w: any) => w && (w.summary || (w.daily_forecast || []).length > 0 || (w.packing_tips || []).length > 0);
const hasPacking = (p: any) => p && p.length > 0;

export default function PlanView({ onShowPackingList }: PlanViewProps) {
  const { plan } = useTrip()
  const req = plan.request
  const cleanDest = req.destination.split(',')[0].trim().toLowerCase()
  const bgUrl = `${BASE_URL}/api/image?dest=${encodeURIComponent(cleanDest)}`

  // Explicitly defined row 1: Itinerary, Flights, Hotels, Budget
  const row1 = [
    hasItinerary(plan.itinerary) ? <ErrorBoundary fallbackName="Itinerary" key="itinerary"><ItinerarySection /></ErrorBoundary> : null,
    hasFlights(plan.flights) ? <ErrorBoundary fallbackName="Flights" key="flights"><FlightSection /></ErrorBoundary> : null,
    hasHotels(plan.hotels) ? <ErrorBoundary fallbackName="Hotels" key="hotels"><HotelSection hotels={plan.hotels} /></ErrorBoundary> : null,
    hasBudget(plan.budget) ? <ErrorBoundary fallbackName="Budget" key="budget"><BudgetSection plan={plan} /></ErrorBoundary> : null,
  ]

  // Explicitly defined row 2: Currency, Food, Weather, Visa
  const row2 = [
    hasCurrency(plan.currency) ? <ErrorBoundary fallbackName="Currency" key="currency"><CurrencySection currency={plan.currency} /></ErrorBoundary> : null,
    hasFood(plan.food) ? <ErrorBoundary fallbackName="Food" key="food"><FoodSection food={plan.food} /></ErrorBoundary> : null,
    hasWeather(plan.weather) ? <ErrorBoundary fallbackName="Weather" key="weather"><WeatherSection weather={plan.weather} destination={req.destination} travelMonth={req.travel_month} /></ErrorBoundary> : null,
    hasVisa(plan.visa) ? <ErrorBoundary fallbackName="Visa" key="visa"><VisaSection visa={plan.visa} /></ErrorBoundary> : null,
  ]
  
  const rows = [row1, row2]

  return (
    <div className="space-y-6">
      {/* Hero Header - Full Width with dark gradient overlay for legibility */}
      <div 
        className="card relative overflow-hidden min-h-[300px] flex flex-col justify-end border-white/10 shadow-2xl bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to bottom right, rgba(19, 27, 46, 0.3), rgba(6, 13, 32, 0.7)), url('${bgUrl}')` }}
      >
         {/* Content with constrained glassmorphism */}
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 h-full mt-12 bg-[#060d20]/80 backdrop-blur-md p-6 rounded-2xl w-full border border-white/10 shadow-xl max-w-4xl mx-auto">
            <div className="flex-1 w-full text-center md:text-left flex flex-col md:items-start items-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-md break-words min-w-0 max-w-full">
                {req.duration_days ? `${req.duration_days}-Day ` : ''}Trip to {req.destination}
              </h2>
              <p className="text-white/90 text-lg font-medium drop-shadow break-words min-w-0 max-w-full">
                {[
                  req.travel_month,
                  req.num_travelers ? `${req.num_travelers} travelers` : null,
                  req.budget_inr ? `₹${req.budget_inr.toLocaleString('en-IN')} budget` : null
                ].filter(Boolean).join(' • ')}
              </p>
              
              {req.interests && req.interests.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4 min-w-0">
                  {req.interests.map(i => (
                    <span key={i} className="badge bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm min-w-0 break-words">{i}</span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-4 shrink-0">
              {hasPacking(plan.packing_list) && (
                <button 
                  onClick={onShowPackingList}
                  className="badge bg-[#ffb4ab]/10 backdrop-blur-md border border-[#ffb4ab]/50 text-[#ffb4ab] px-4 py-2 font-semibold shadow-[0_0_15px_rgba(255,180,171,0.2)] hover:bg-[#ffb4ab]/20 transition cursor-pointer flex items-center gap-2"
                >
                  🎒 View Packing List
                </button>
              )}
              {plan.budget && plan.budget.is_feasible
                ? <span className="badge bg-[#004e5c]/80 backdrop-blur-md border border-[#4cd7f6]/50 text-[#acedff] px-4 py-2 font-semibold shadow-[0_0_15px_rgba(76,215,246,0.3)] min-w-0 break-words">✅ Budget Feasible</span>
                : <span className="badge bg-[#93000a]/80 backdrop-blur-md border border-[#ffb4ab]/50 text-[#ffdad6] px-4 py-2 font-semibold shadow-[0_0_15px_rgba(255,180,171,0.3)] min-w-0 break-words">⚠️ Budget Tight</span>
              }
            </div>
         </div>
      </div>

      {/* Dynamic Fixed Horizontal Row Containers (4 cards per row) */}
      <div className="w-full space-y-6">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full min-w-0">
            {row.map((section, colIdx) => (
              <div 
                key={colIdx} 
                className="flex-1 min-w-0 h-[450px] flex flex-col w-full overflow-hidden"
              >
                {section || <div className="card h-full flex flex-col justify-center items-center text-white/30 border-dashed border-white/5 bg-[#172033]/30">Not available</div>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Errors (if any agent failed) */}
      {plan.errors && Object.keys(plan.errors).length > 0 && (
        <div className="card border-[#93000a] bg-[#690005]/20 backdrop-blur-md min-w-0 break-words">
          <h3 className="text-[#ffb4ab] font-semibold mb-2 flex items-center gap-2">⚠️ Some agents had issues</h3>
          {Object.entries(plan.errors).map(([agent, err]) => (
            <p key={agent} className="text-sm text-[#ccc3d8] break-words min-w-0"><span className="text-[#ffb4ab]">{agent}:</span> {err}</p>
          ))}
        </div>
      )}
    </div>
  )
}

