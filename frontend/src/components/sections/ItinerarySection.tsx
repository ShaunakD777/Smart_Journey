import { useState } from 'react'
import { useTrip } from '../../context/TripContext'
import { CloudRain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityType } from '../../types'

function getIconForActivity(text: string, type?: ActivityType) {
  if (type) {
    switch (type) {
      case 'DINING': return '🍽️'
      case 'SHOPPING': return '🛍️'
      case 'EXPLORING': return '🚶'
      case 'TRANSIT': return '🚆'
      case 'SIGHTSEEING': return '🏛️'
      case 'RELAXING': return '☕'
      case 'NIGHTLIFE': return '🍸'
      case 'CULTURE': return '🎭'
      case 'NATURE': return '🌲'
      case 'ADVENTURE': return '🧗'
      case 'ENTERTAINMENT': return '🎪'
      case 'WELLNESS': return '💆'
      case 'ACCOMMODATION': return '🏨'
    }
  }
  
  // Fallback heuristic if backend hasn't updated yet
  const lower = text.toLowerCase()
  if (lower.includes('breakfast') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('food') || lower.includes('eat') || lower.includes('restaurant')) return '🍽️'
  if (lower.includes('shop') || lower.includes('market') || lower.includes('mall') || lower.includes('buy')) return '🛍️'
  if (lower.includes('walk') || lower.includes('explore') || lower.includes('hike') || lower.includes('stroll')) return '🚶'
  if (lower.includes('museum') || lower.includes('temple') || lower.includes('shrine') || lower.includes('castle')) return '🏛️'
  if (lower.includes('train') || lower.includes('bus') || lower.includes('travel') || lower.includes('station')) return '🚆'
  return '📍'
}

export default function ItinerarySection() {
  const { plan } = useTrip()
  const itinerary = plan.itinerary
  const [selectedDayIdx, setSelectedDayIdx] = useState(0)
  const [showSelector, setShowSelector] = useState(false)
  const [showRain, setShowRain] = useState(false)

  const days = itinerary.days || []
  const generalTips = itinerary.general_tips || []

  if (days.length === 0) return null

  const currentDay = days[selectedDayIdx]

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Day {currentDay.day}: {currentDay.city}</h2>
          {currentDay.date_note && <p className="text-sm font-medium text-white/60 mt-1">{currentDay.date_note}</p>}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowSelector(!showSelector)}
            aria-expanded={showSelector}
            aria-controls="day-selector-menu"
            className="text-[#4cd7f6] text-sm font-semibold hover:text-white transition flex items-center gap-1"
          >
            Select Day ▼
          </button>
          
          <AnimatePresence>
            {showSelector && (
              <motion.div 
                id="day-selector-menu"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-8 bg-[#172033] border border-white/10 rounded-xl shadow-2xl z-20 w-48 overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto">
                  {days.map((d: any, idx: number) => (
                    <button 
                      key={d.day}
                      onClick={() => { setSelectedDayIdx(idx); setShowSelector(false) }}
                      className={`w-full text-left px-4 py-3 text-sm transition ${idx === selectedDayIdx ? 'bg-[#4cd7f6]/10 text-[#4cd7f6] font-bold' : 'text-white/80 hover:bg-white/5'}`}
                    >
                      Day {d.day}: {d.city}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentDay.day}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Morning */}
          {currentDay.morning && (
            <div className="bg-[#172033] rounded-2xl p-4 border border-white/5 flex gap-4 items-start shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#202b40] flex items-center justify-center text-2xl shrink-0">
                 {getIconForActivity(currentDay.morning, currentDay.morning_type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="font-bold text-white leading-tight">{currentDay.morning.split('.')[0]}</h3>
                  <span className="text-[#4cd7f6] text-xs font-bold whitespace-nowrap tracking-wider">09:00 AM</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mt-1">{currentDay.morning}</p>
              </div>
            </div>
          )}
          
          {/* Afternoon */}
          {currentDay.afternoon && (
            <div className="bg-[#172033] rounded-2xl p-4 border border-white/5 flex gap-4 items-start shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#202b40] flex items-center justify-center text-2xl shrink-0">
                 {getIconForActivity(currentDay.afternoon, currentDay.afternoon_type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="font-bold text-white leading-tight">{currentDay.afternoon.split('.')[0]}</h3>
                  <span className="text-[#4cd7f6] text-xs font-bold whitespace-nowrap tracking-wider">02:30 PM</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mt-1">{currentDay.afternoon}</p>
              </div>
            </div>
          )}
          
          {/* Evening */}
          {currentDay.evening && (
            <div className="bg-[#1c1635] rounded-2xl p-4 border border-[#7c3aed]/20 flex gap-4 items-start shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#2b1c4e] flex items-center justify-center text-2xl shrink-0">
                 {getIconForActivity(currentDay.evening, currentDay.evening_type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h3 className="font-bold text-white leading-tight">{currentDay.evening.split('.')[0]}</h3>
                  <span className="text-[#d2bbff] text-xs font-bold whitespace-nowrap tracking-wider">07:00 PM</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mt-1">{currentDay.evening}</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Highlights */}
      {(currentDay.highlights || []).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {(currentDay.highlights || []).map((h: any, i: number) => {
            const name = typeof h === 'string' ? h : h.name
            const link = typeof h === 'string' ? null : h.maps_link
            
            if (link) {
              return (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="badge bg-[#172033] border border-white/10 text-[#4cd7f6] text-xs px-3 py-1.5 shadow-sm hover:bg-[#4cd7f6]/10 transition">
                  📍 {name}
                </a>
              )
            }
            return (
              <span key={i} className="badge bg-[#172033] border border-white/10 text-[#4cd7f6] text-xs px-3 py-1.5 shadow-sm">
                📍 {name}
              </span>
            )
          })}
        </div>
      )}

      {/* Rain Alternative */}
      {itinerary.rain_alternative_plan && (
        <div className="mt-6 pt-4 border-t border-white/5">
          <button
            onClick={() => setShowRain(!showRain)}
            aria-expanded={showRain}
            className="flex items-center gap-2 text-[#d2bbff] text-sm font-semibold hover:text-white transition"
          >
            <CloudRain size={16} /> Rain alternative plan {showRain ? '▲' : '▼'}
          </button>
          <AnimatePresence>
            {showRain && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="p-4 bg-[#172033]/80 border border-[#7c3aed]/20 rounded-xl text-sm text-[#dbe2fd]">
                  {itinerary.rain_alternative_plan}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* General tips */}
      {generalTips.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Tips</p>
          {generalTips.map((tip: string, i: number) => (
            <p key={i} className="text-sm text-white/70 flex items-start gap-2">
              <span className="text-[#4cd7f6] mt-0.5">•</span> <span>{tip}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
