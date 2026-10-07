import { useState, useRef, useEffect } from 'react'
import { useTrip } from '../context/TripContext'
import { ErrorBoundary } from './ErrorBoundary'
import FlightSection from './sections/FlightSection'
import HotelSection from './sections/HotelSection'
import WeatherSection from './sections/WeatherSection'
import FoodSection from './sections/FoodSection'
import ItinerarySection from './sections/ItinerarySection'
import RouteSection from './sections/RouteSection'
import BudgetSection from './sections/BudgetSection'
import CurrencySection from './sections/CurrencySection'
import VisaSection from './sections/VisaSection'
import PackingSection from './sections/PackingSection'
import { ArrowLeft, Send, Bot, User, Loader2, MessageSquare } from 'lucide-react'
import { api } from '../api'

interface CategoryViewProps {
  category: string
  onBack: () => void
}

interface ChatMessage {
  sender: 'user' | 'assistant'
  text: string
}

const STARTER_PROMPTS: Record<string, string[]> = {
  budget: [
    "How can I cut down on food expenses?",
    "What's a reasonable emergency buffer?",
    "Should I carry cash or cards?"
  ],
  flights: [
    "What is the fastest mode of transit for this route?",
    "Are trains or buses better/cheaper than flying?",
    "Which booking platforms offer the best rates?"
  ],
  hotels: [
    "Which area is the safest or most convenient?",
    "Are hostels cheaper than these options?",
    "Do these options include breakfast?"
  ],
  visa: [
    "What is the official visa fee for Indians?",
    "How long does the e-Visa processing take?",
    "What documents do I need to upload?"
  ],
  itinerary: [
    "Suggest alternative plans if it rains.",
    "Can you add more cultural sights to this?",
    "Is this schedule too hectic for a couple?"
  ],
  food: [
    "Suggest some vegetarian street food options.",
    "What are the must-try local desserts?",
    "Which restaurants need bookings in advance?"
  ],
  currency: [
    "Where is the best place to exchange cash?",
    "Are credit cards widely accepted here?",
    "What is the standard tipping custom?"
  ],
  weather: [
    "What specific clothes should I pack?",
    "Is it rainy season during my travel month?",
    "What is the average daily temperature?"
  ],
  route: [
    "Is a local rail pass worth it for this?",
    "What is the cheapest local transit mode?",
    "How long is the travel between key cities?"
  ],
  packing: [
    "Are there any cultural dress codes to follow?",
    "Should I pack specific adapter plugs?",
    "What toiletries or medicine are hard to find?"
  ]
}

export default function CategoryView({ category, onBack }: CategoryViewProps) {
  const { plan } = useTrip()
  const req = plan.request
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'assistant', text: `Hi! I'm your category Copilot for ${category.replace('-', ' ')}. Ask me anything about this section!` }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const cleanDest = req.destination.split(',')[0].trim().toLowerCase()
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const bgUrl = `${BASE_URL}/api/image?dest=${encodeURIComponent(cleanDest)}`

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return

    setMessages(prev => [...prev, { sender: 'user', text: textToSend }])
    setLoading(true)

    try {
      const prompt = `[Category Context: ${category}] ${textToSend}`
      const response = await api.post(`/plan/${plan.session_id}/chat`, {
        message: prompt
      })
      setMessages(prev => [...prev, { sender: 'assistant', text: response.data.response }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { sender: 'assistant', text: "Sorry, I couldn't reach the Copilot server. Please check your backend connection." }])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    switch (category) {
      case 'budget':
        return <BudgetSection plan={plan} />
      case 'flights':
        return <FlightSection />
      case 'hotels':
        return <HotelSection hotels={plan.hotels} />
      case 'visa':
        return <VisaSection visa={plan.visa} />
      case 'itinerary':
        return <ItinerarySection />
      case 'food':
        return <FoodSection food={plan.food} />
      case 'currency':
        return <CurrencySection currency={plan.currency} />
      case 'weather':
        return <WeatherSection weather={plan.weather} destination={req.destination} />
      case 'route':
        return <RouteSection route={plan.route} />
      case 'packing':
        return <PackingSection packingList={plan.packing_list} attractions={plan.tourist_attractions} />
      default:
        return <p className="text-gray-400">Section details not found.</p>
    }
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      budget: '💰 Trip Budget',
      flights: '✈️ Flight Recommendations',
      hotels: '🏨 Hotel & Lodging',
      visa: '🛂 Visa & Entry Rules',
      itinerary: '📅 Day-by-Day Itinerary',
      food: '🍜 Food & Dining',
      currency: '💱 Currency & Money',
      weather: '🌤️ Weather & Forecast',
      route: '🚆 Transit & Route Logistics',
      packing: '🎒 Packing List & Highlights'
    }
    return titles[category] || category
  }

  const starters = STARTER_PROMPTS[category] || []

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full bg-[#060d20]/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Category Header */}
      <header className="p-4 border-b border-white/5 bg-[#131b2e]/30 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#4cd7f6]/50 bg-white/5 text-gray-300 hover:text-white transition text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back to Plan
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">{getTitle()}</h2>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-2 rounded-xl border transition ${isChatOpen ? 'border-[#4cd7f6] bg-[#4cd7f6]/10 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}
          title="Toggle Category Chat"
        >
          <MessageSquare size={16} />
        </button>
      </header>

      {/* Two block layout: Left for Details (Widescreen when chat is closed), Right for Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Detail view (stretches to full width if chat is closed) */}
        <div className={`overflow-y-auto p-6 md:p-8 transition-all duration-300 ${isChatOpen ? 'w-full md:w-3/5 border-r border-[#ffffff]/5' : 'w-full'}`}>
          <div className="max-w-[1440px] mx-auto w-full space-y-6">
            
            {/* Hero Header Banner */}
            <div 
              className="card relative overflow-hidden min-h-[200px] flex flex-col justify-end border-white/10 shadow-2xl bg-gradient-to-br from-[#131b2e] to-[#060d20] bg-cover bg-center"
              style={{ backgroundImage: `url('${bgUrl}')` }}
            >
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 h-full mt-6 bg-[#060d20]/80 backdrop-blur-md p-6 rounded-2xl max-w-2xl border border-white/10 shadow-xl">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-md">
                      {req.duration_days}-Day Trip to {req.destination}
                    </h2>
                    <p className="text-white/90 text-sm font-medium drop-shadow">
                      {req.travel_month} · {req.num_travelers} travelers · ₹{req.budget_inr.toLocaleString('en-IN')} budget
                    </p>
                  </div>
               </div>
            </div>

            <ErrorBoundary fallbackName={category}>
              {renderContent()}
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Side: Chat Panel (hides if isChatOpen is false) */}
        {isChatOpen && (
          <div className="w-full md:w-2/5 flex flex-col h-full bg-[#060d20]/60 relative transition-all duration-300 border-l border-[#ffffff]/5">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
              {messages.map((msg, idx) => {
                const isBot = msg.sender === 'assistant'
                return (
                  <div key={idx} className={`flex gap-3 items-start ${isBot ? '' : 'flex-row-reverse'}`}>
                    <div className={`p-2 rounded-xl shrink-0 ${isBot ? 'bg-[#7c3aed]/10 text-[#d2bbff]' : 'bg-[#4cd7f6]/10 text-[#4cd7f6]'}`}>
                      {isBot ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[80%] ${isBot ? 'bg-[#131b2e]/40 text-gray-200 border border-white/5' : 'bg-gradient-to-r from-[#7c3aed] to-[#4cd7f6] text-white font-medium'}`}>
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-xl bg-[#7c3aed]/10 text-[#d2bbff] shrink-0">
                    <Bot size={14} />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#131b2e]/40 border border-white/5 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-[#4cd7f6]" />
                    <span className="text-xs text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom Pinned Typing Bar & Suggested Pills */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#060d20] border-t border-white/5">
              {/* Clickable suggestion prompts */}
              {messages.length === 1 && starters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {starters.map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleSend(st)}
                      className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 hover:border-[#4cd7f6]/50 bg-white/5 text-gray-400 hover:text-white transition font-medium"
                    >
                      💡 {st}
                    </button>
                  ))}
                </div>
              )}
              
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (inputValue.trim()) {
                    handleSend(inputValue)
                    setInputValue('')
                  }
                }}
                className="relative"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder={`Ask about ${category}...`}
                  className="w-full bg-[#0B1326] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:outline-none focus:border-[#4cd7f6]/50 focus:ring-1 focus:ring-[#4cd7f6]/50 transition-all placeholder-gray-500"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="absolute right-2 top-2 p-1.5 bg-[#4cd7f6] disabled:opacity-30 rounded-lg text-[#0B1326] hover:opacity-90 transition disabled:cursor-not-allowed"
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
