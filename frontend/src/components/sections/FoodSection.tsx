import type { FoodInfo } from '../../types'

interface Props { food: FoodInfo }



export default function FoodSection({ food }: Props) {
  const mustTryDishes = food.must_try_dishes || []
  const recommendations = food.restaurant_recommendations || []
  const foodTips = food.food_tips || []

  if (mustTryDishes.length === 0 && recommendations.length === 0 && foodTips.length === 0 && (!food.estimated_daily_food_cost_inr || food.estimated_daily_food_cost_inr <= 0)) {
    return null
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-5">🍜 Food & Restaurants</h2>

      {food.estimated_daily_food_cost_inr > 0 && (
        <div className="bg-[#172033] rounded-2xl p-4 mb-6 border border-white/5 flex justify-between items-center shadow-sm">
           <span className="text-sm font-semibold text-white/70">Estimated Daily Cost</span>
           <span className="text-lg font-bold text-[#4cd7f6]">₹{food.estimated_daily_food_cost_inr.toLocaleString('en-IN')} / day</span>
        </div>
      )}

      {mustTryDishes.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-3">Must-try dishes</p>
          <div className="flex flex-wrap gap-2">
            {mustTryDishes.map((d, i) => (
              <span key={i} className="badge bg-[#1c1635] text-[#ffb4ab] border border-red-500/20">{d}</span>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Recommendations</p>
          {recommendations.map((r, i) => (
            <div key={i} className="bg-[#172033] rounded-2xl p-4 border border-white/5 flex gap-4 items-start shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#202b40] flex items-center justify-center text-xl shrink-0">
                🍽️
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-white leading-tight">{r.name}</h3>
                  <span className={`text-xs font-bold uppercase tracking-wider ${r.price_range === 'Splurge' ? 'text-[#ffb4ab]' : r.price_range === 'Mid-range' ? 'text-yellow-400' : 'text-green-400'}`}>
                    {r.price_range}
                  </span>
                </div>
                <p className="text-xs text-white/60 mb-2">{r.location} · {r.cuisine}</p>
                {r.maps_link && (
                  <a href={r.maps_link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4cd7f6] hover:underline flex items-center gap-1 mb-2">
                    📍 View on Map
                  </a>
                )}
                {r.specialty && <p className="text-sm text-white/80 leading-relaxed bg-[#202b40] rounded-lg p-2 mt-2">✨ {r.specialty}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {foodTips.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Food tips</p>
          {foodTips.map((t, i) => (
            <p key={i} className="text-sm text-white/70 flex items-start gap-2 leading-relaxed">
              <span className="text-[#4cd7f6] mt-0.5">•</span> <span>{t}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
