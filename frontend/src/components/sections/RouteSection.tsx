import type { RouteInfo } from '../../types'
import { MapPin, ExternalLink } from 'lucide-react'

interface Props { route: RouteInfo }

const getModeIcon = (mode: string) => {
  const normalized = (mode || '').toLowerCase()
  if (normalized.includes('shinkansen')) return '🚄'
  if (normalized.includes('bullet')) return '🚄'
  if (normalized.includes('train') || normalized.includes('rail')) return '🚆'
  if (normalized.includes('bus')) return '🚌'
  if (normalized.includes('ferry') || normalized.includes('boat') || normalized.includes('ship')) return '⛴️'
  if (normalized.includes('flight') || normalized.includes('plane') || normalized.includes('air')) return '✈️'
  if (normalized.includes('walk') || normalized.includes('foot')) return '🚶'
  if (normalized.includes('car') || normalized.includes('cab') || normalized.includes('taxi') || normalized.includes('drive')) return '🚗'
  if (normalized.includes('subway') || normalized.includes('metro')) return '🚇'
  return '🚌'
}

export default function RouteSection({ route }: Props) {
  const cityOrder = route.optimal_city_order || []
  const transportLegs = route.transport_between_cities || []
  const localTips = route.local_transport_tips || []

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🗺️ Optimal Route</h2>
        {route.google_maps_link && (
          <a
            href={route.google_maps_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink size={14} /> Open in Maps
          </a>
        )}
      </div>

      {/* City order */}
      {cityOrder.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {cityOrder.map((city, i) => (
            <span key={city} className="flex items-center gap-1">
              <span className="badge bg-purple-900 text-purple-300">
                <MapPin size={12} /> {city}
              </span>
              {i < cityOrder.length - 1 && <span className="text-gray-600">→</span>}
            </span>
          ))}
        </div>
      )}

      {/* Transport legs */}
      {transportLegs.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Inter-city transport</p>
          {transportLegs.map((leg, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3">
              <span className="text-xl">{getModeIcon(leg.mode || '')}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{leg.from} → {leg.to}</p>
                <p className="text-xs text-gray-500">{leg.mode} · {leg.duration}</p>
                {leg.booking_tip && <p className="text-xs text-blue-400 mt-0.5">{leg.booking_tip}</p>}
              </div>
              {leg.cost_inr > 0 && (
                <span className="text-sm text-green-400">₹{leg.cost_inr.toLocaleString('en-IN')}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {localTips.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase font-semibold">Local transport tips</p>
          {localTips.map((t, i) => <p key={i} className="text-sm text-gray-400">• {t}</p>)}
        </div>
      )}
    </div>
  )
}
