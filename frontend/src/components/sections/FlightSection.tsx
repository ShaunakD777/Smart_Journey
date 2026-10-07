import { useTrip } from '../../context/TripContext'

export default function FlightSection() {
  const { plan } = useTrip()
  const flights = plan.flights
  
  if (!flights) return null

  const airlines = flights.airlines || []
  const recommendedRoutes = flights.recommended_routes || []
  const tips = flights.tips || []

  if (airlines.length === 0 && recommendedRoutes.length === 0 && tips.length === 0 && (!flights.estimated_cost_inr || flights.estimated_cost_inr <= 0)) {
    return null
  }

  const getRouteIcon = (routeStr: string) => {
    const s = routeStr.toLowerCase()
    if (s.includes('train') || s.includes('rail') || s.includes('express')) return '🚆'
    if (s.includes('bus') || s.includes('volvo') || s.includes('coach')) return '🚌'
    if (s.includes('car') || s.includes('drive') || s.includes('taxi') || s.includes('cab')) return '🚗'
    return '✈️'
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      <h2 className="text-2xl font-bold tracking-tight mb-6">🚆 Transportation</h2>
      
      {flights.estimated_cost_inr > 0 && (
        <div className="bg-[#172033] rounded-2xl p-5 mb-6 border border-white/5">
          <p className="text-3xl font-bold text-white tracking-tight mb-1">
            ₹{flights.estimated_cost_inr.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-[#4cd7f6] font-semibold tracking-wide uppercase">
            Estimated Round-Trip
          </p>
        </div>
      )}
      
      {airlines.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-3">Suggested Carriers & Providers</p>
          <div className="flex flex-wrap gap-2">
            {airlines.map((a: string) => <span key={a} className="badge bg-[#1c1635] text-[#d2bbff] border border-[#7c3aed]/30">{a}</span>)}
          </div>
        </div>
      )}
      
      {recommendedRoutes.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Optimal Routes</p>
          {recommendedRoutes.map((r: string, i: number) => (
            <div key={i} className="text-sm font-medium text-white/80 bg-[#172033] border border-white/5 rounded-xl px-4 py-3 leading-relaxed shadow-sm flex items-center gap-2">
              <span className="text-base">{getRouteIcon(r)}</span> <span>{r}</span>
            </div>
          ))}
        </div>
      )}
      
      {tips.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Booking Advice</p>
          {tips.map((t: string, i: number) => (
            <p key={i} className="text-sm text-white/70 flex items-start gap-2 leading-relaxed">
              <span className="text-[#4cd7f6] mt-0.5">•</span> <span>{t}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
