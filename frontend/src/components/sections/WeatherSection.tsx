import { Cloud, CloudRain, Sun, Umbrella, Wind, CheckCircle2 } from 'lucide-react'
import type { WeatherInfo } from '../../types'

interface Props { 
  weather: WeatherInfo
  destination?: string 
  travelMonth?: string
}

export default function WeatherSection({ weather, destination, travelMonth }: Props) {
  const dailyForecast = weather.daily_forecast || []
  const packingTips = weather.packing_tips || []

  if (!weather.summary && !weather.rain_probability && dailyForecast.length === 0 && packingTips.length === 0) {
    return null
  }

  // Helper to determine icon based on text
  const getWeatherIcon = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('rain') || lower.includes('shower')) return <CloudRain className="text-blue-400" size={32} />
    if (lower.includes('cloud')) return <Cloud className="text-gray-400" size={32} />
    if (lower.includes('sun') || lower.includes('clear')) return <Sun className="text-yellow-400" size={32} />
    return <Sun className="text-yellow-400" size={32} />
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words bg-[#0B1326] border-white/5">
      <h2 className="text-2xl font-bold mb-1 text-white tracking-tight">Weather Forecast</h2>
      <p className="text-xs text-white/50 mb-6">{destination || 'Location'} • {travelMonth}</p>
      
      {/* Top Main Widget */}
      <div className="bg-white/5 rounded-2xl p-5 mb-6 border border-white/10 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none z-0"></div>
        
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-3">
            <div className="mt-1 shrink-0">
              {getWeatherIcon(weather.summary || '')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-black text-white tracking-tight">
                {weather.summary && weather.summary.match(/(\d+\.?\d*°[CF])/) 
                  ? weather.summary.match(/(\d+\.?\d*°[CF])/)?.[1] 
                  : 'Local Climate'}
              </div>
              <div className="text-sm font-medium text-white/80 mt-1 whitespace-pre-wrap">
                {(weather.summary && weather.summary.trim().length > 3) 
                  ? weather.summary 
                  : 'Typical weather for this time of year.'}
              </div>
            </div>
            
            {weather.rain_probability && weather.rain_probability.trim().length > 0 && (
              <div className="shrink-0 text-right bg-black/20 rounded-lg p-2 border border-white/5">
                <div className="flex items-center justify-end gap-1 mb-1">
                  <Umbrella size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Rain</span>
                </div>
                <div className="text-lg font-bold text-white leading-none">
                  {weather.rain_probability.replace(/chance/i, '').trim()}
                </div>
              </div>
            )}
          </div>

          {weather.monthly_overview && weather.monthly_overview.trim().length > 0 && (
            <div className="pt-4 border-t border-white/10 text-sm text-white/70 leading-relaxed mt-4">
              {weather.monthly_overview}
            </div>
          )}
        </div>
      </div>

      {weather.packing_tips && weather.packing_tips.length > 0 && (
        <div className="mt-auto shrink-0">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Wind size={14} className="text-[#a78bfa]" /> Packing Essentials
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {weather.packing_tips.slice(0, 4).map((tip, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-2 hover:bg-white/10 transition">
                <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
                <span className="text-xs text-white/80 font-medium leading-snug">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
