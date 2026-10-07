import type { HotelInfo } from '../../types'

interface Props { hotels: HotelInfo }



export default function HotelSection({ hotels }: Props) {
  const recommendations = hotels.recommendations || []
  const tips = hotels.tips || []

  if (recommendations.length === 0 && tips.length === 0 && (!hotels.estimated_total_cost_inr || hotels.estimated_total_cost_inr <= 0)) {
    return null
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-5">🏨 Hotels</h2>
      
      {hotels.estimated_total_cost_inr > 0 && (
        <div className="bg-[#172033] rounded-2xl p-5 mb-6 border border-white/5">
          <p className="text-3xl font-bold text-white tracking-tight mb-1">
            ₹{hotels.estimated_total_cost_inr.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-[#d2bbff] font-semibold tracking-wide uppercase">
            Total Accommodation
          </p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Recommendations</p>
        {recommendations.map((h, i) => (
          <div key={i} className="bg-[#172033] rounded-2xl p-4 border border-white/5 flex gap-4 items-start shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#202b40] flex items-center justify-center text-xl shrink-0">
              🛏️
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1 gap-2">
                <h3 className="font-bold text-white leading-tight">{h.name}</h3>
                <span className="text-[#4cd7f6] font-bold whitespace-nowrap">
                  {h.price_per_night_inr ? `₹${h.price_per_night_inr.toLocaleString('en-IN')}/nt` : 'N/A'}
                </span>
              </div>
              <p className="text-xs text-white/60 mb-2">{h.location}</p>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="badge bg-[#202b40] text-white/90 border border-white/10 text-xs">{h.type || 'Accommodation'}</span>
                {h.rating && <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">⭐ {h.rating}</span>}
                {h.booking_link && (
                  <a href={h.booking_link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4cd7f6] hover:underline ml-2 flex items-center gap-1">
                    🔗 View on Map / Book
                  </a>
                )}
              </div>
              {h.why && <p className="text-sm text-white/80 leading-relaxed mt-3 bg-[#202b40] rounded-lg p-2">💡 {h.why}</p>}
            </div>
          </div>
        ))}
      </div>

      {tips.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Tips</p>
          {tips.map((t, i) => (
            <p key={i} className="text-sm text-white/70 flex items-start gap-2 leading-relaxed">
              <span className="text-[#4cd7f6] mt-0.5">•</span> <span>{t}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
