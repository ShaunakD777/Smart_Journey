import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface PlanWizardProps {
  onSubmit: (compiledQuery: string) => void
}

const INTERESTS = [
  { id: 'Foodie', label: '🍜 Foodie / Street Food' },
  { id: 'Adventure', label: '🧗 Adventure / Hiking' },
  { id: 'Beaches', label: '🏖️ Beaches / Relaxation' },
  { id: 'History', label: '🏯 Temples & History' },
  { id: 'Shopping', label: '🛍️ Local Markets & Shopping' },
  { id: 'Art', label: '🎨 Art & Museums' },
  { id: 'Nature', label: '🌲 Scenic Nature' },
  { id: 'Nightlife', label: '🍹 Nightlife & Clubs' }
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function PlanWizard({ onSubmit }: PlanWizardProps) {
  const { user } = useAuth()
  const defaultOrigin = user?.settings?.default_origin || ''

  const [step, setStep] = useState(1)
  const [origin, setOrigin] = useState(defaultOrigin)
  const [destination, setDestination] = useState('')
  const [duration, setDuration] = useState(5)
  const [travelMonth, setTravelMonth] = useState('October')
  const [travelers, setTravelers] = useState('Couple')
  const [budget, setBudget] = useState('150000')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleFinish = () => {
    if (!destination.trim() || !origin.trim()) return
    // Compile parameters into a natural prompt for the AI parser
    const interestsString = selectedInterests.length > 0 
      ? `Interests: ${selectedInterests.join(', ')}.` 
      : ''
    const travelersText = ['Solo', 'Couple', 'Family (4)', 'Friends (8)'].includes(travelers) ? travelers : `${travelers} people`
    const compiledQuery = `Plan a ${duration}-day trip from ${origin} to ${destination} in ${travelMonth} for ${travelersText}. Budget ₹${budget}. ${interestsString}`
    onSubmit(compiledQuery)
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0
    })
  }

  const stepDirection = step // basic tracker

  return (
    <div className="card bg-gradient-to-br from-[#131b2e] to-[#060d20] border-white/5 shadow-2xl py-6 px-8 max-w-2xl mx-auto rounded-3xl relative overflow-hidden">
      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#4cd7f6]">Step {step} of 5</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(s => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-[#4cd7f6]' : s < step ? 'w-2 bg-[#7c3aed]' : 'w-2 bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[220px]">
        <AnimatePresence mode="wait" custom={stepDirection}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">Where is your trip?</h2>
              
              {!defaultOrigin && (
                <div className="space-y-2">
                  <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-xl p-3 mb-2">
                    <p className="text-xs text-[#d2bbff]">
                      💡 Tip: You can set a default origin in Settings to skip this step in the future.
                    </p>
                  </div>
                  <label className="text-sm font-semibold text-gray-400">Origin (Leaving from)</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    maxLength={100}
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4cd7f6]/50 focus:ring-1 focus:ring-[#4cd7f6]/50 transition-all text-sm"
                    placeholder="e.g. New Delhi, India"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Destination (Going to)</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4cd7f6]/50 focus:ring-1 focus:ring-[#4cd7f6]/50 transition-all text-sm"
                  placeholder="e.g. Tokyo, Japan"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">How long and when?</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-[#4cd7f6] text-base">{duration} Days</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4cd7f6]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Travel Month</label>
                <select
                  value={travelMonth}
                  onChange={e => setTravelMonth(e.target.value)}
                  className="w-full bg-[#0B1326] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4cd7f6]/50 focus:ring-1 focus:ring-[#4cd7f6]/50 transition-all"
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">Who is joining you?</h2>
              <p className="text-gray-400 text-sm">Help us tailor lodging recommendations to your group dynamic.</p>
              <div className="grid grid-cols-2 gap-3">
                {['Solo', 'Couple', 'Family (4)', 'Friends (8)'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTravelers(t)}
                    className={`py-4 rounded-xl border text-center transition font-semibold text-sm ${travelers === t ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-white shadow-[0_0_15px_rgba(124,58,237,0.1)]' : 'border-white/5 bg-[#0B1326]/50 text-gray-400 hover:bg-white/5'}`}
                  >
                    {t === 'Solo' ? '👤 Solo' : t === 'Couple' ? '👫 Couple' : t === 'Family (4)' ? '👨‍👩‍👧 Family (4)' : '👥 Friends (8)'}
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <label className="text-sm font-semibold text-gray-400 block mb-2">Exact number of people</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={['Solo', 'Couple', 'Family (4)', 'Friends (8)'].includes(travelers) ? (travelers === 'Solo' ? 1 : travelers === 'Couple' ? 2 : travelers === 'Family (4)' ? 4 : 8) : parseInt(travelers) || 1}
                  onChange={e => setTravelers(e.target.value)}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
                />
                {!['Solo', 'Couple', 'Family (4)', 'Friends (8)'].includes(travelers) && (
                  <div className="text-center text-[#d2bbff] font-bold text-sm mt-2">{travelers} people</div>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">What is your budget limit?</h2>
              <p className="text-gray-400 text-sm">Enter the total target budget in Indian Rupees (INR) for all travelers.</p>
              <div className="relative">
                <span className="absolute left-4 top-3 text-lg font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  autoFocus
                  required
                  min="1000"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl pl-8 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4cd7f6]/50 focus:ring-1 focus:ring-[#4cd7f6]/50 text-lg transition-all"
                  placeholder="e.g. 150000"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['50000', '150000', '300000'].map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(b)}
                    className={`text-xs px-4 py-2 rounded-full border transition ${budget === b ? 'border-[#4cd7f6] bg-[#4cd7f6]/10 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    ₹{Number(b).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">What is the vibe?</h2>
              <p className="text-gray-400 text-sm">Select one or more interests to build custom daily schedules.</p>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {INTERESTS.map(int => {
                  const isSel = selectedInterests.includes(int.id)
                  return (
                    <button
                      key={int.id}
                      type="button"
                      onClick={() => toggleInterest(int.id)}
                      className={`py-3 px-3 rounded-xl border text-left text-xs transition font-semibold truncate ${isSel ? 'border-[#4cd7f6] bg-[#4cd7f6]/10 text-white' : 'border-white/5 bg-[#0B1326]/50 text-gray-400 hover:bg-white/5'}`}
                    >
                      {int.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1}
          className={`flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={step === 1 && (!destination.trim() || !origin.trim())}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-[#4cd7f6] hover:bg-[#4cd7f6]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[#0B1326] font-bold text-sm transition-all"
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#4cd7f6] hover:opacity-90 rounded-xl text-white font-bold text-sm shadow-lg shadow-[#7c3aed]/20 transition-all"
          >
            Generate Plan <Send size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
