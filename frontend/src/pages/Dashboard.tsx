import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { startPlan, getPlan } from '../api'
import type { TripPlan } from '../types'
import { TripProvider } from '../context/TripContext'
import { useAuth } from '../context/AuthContext'
import PlanView from '../components/PlanView'
import PlanWizard from '../components/PlanWizard'
import CategoryView from '../components/CategoryView'
import SettingsView from '../components/SettingsView'
import AgentReasoningTerminal from '../components/AgentReasoningTerminal'
import TerminalModal from '../components/TerminalModal'
import PackingSection from '../components/sections/PackingSection'
import { LogOut, Download, Menu, X, ChevronDown } from 'lucide-react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { exportPlanToPdf } from '../utils/pdfExport'

type AppStatus = 'idle' | 'loading' | 'done' | 'error'
type ViewState = 'planner' | 'settings' | string

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [currentView, setCurrentView] = useState<ViewState>('planner')
  const [inputMode, setInputMode] = useState<'wizard' | 'prompt'>('wizard')
  const [status, setStatus] = useState<AppStatus>('idle')
  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [shouldFetchFinal, setShouldFetchFinal] = useState(false)
  const [terminalModalOpen, setTerminalModalOpen] = useState(false)
  const [appMode, setAppMode] = useState<'demo' | 'dev'>('demo')
  
  // New UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [packingModalOpen, setPackingModalOpen] = useState(false)

  const [lastQuery, setLastQuery] = useState('')

  // Handle clicking outside to close dropdown
  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Start trip planning mutation
  const startPlanMutation = useMutation({
    mutationFn: startPlan,
    onSuccess: (data) => {
      setSessionId(data.session_id)
      setStatus('loading')
    },
    onError: (error: any) => {
      setErrorMsg(error?.response?.data?.detail || 'Failed to start planning. Is the backend running?')
      setStatus('error')
    }
  })

  // Fetch final plan query using React Query once the stream completes
  const { data: pollRes, error: pollError } = useQuery({
    queryKey: ['plan', sessionId, 'final'],
    queryFn: () => getPlan(sessionId),
    enabled: !!sessionId && shouldFetchFinal,
    refetchOnWindowFocus: false,
    retry: 3,
  })

  // Process polling result
  useEffect(() => {
    if (!pollRes) return

    if (pollRes.status === 'done' && pollRes.plan) {
      setShouldFetchFinal(false)
      setPlan(pollRes.plan)
      setStatus('done')
    } else if (pollRes.status === 'error') {
      setShouldFetchFinal(false)
      setErrorMsg(pollRes.error || 'Planning failed. Please try again.')
      setStatus('error')
    } else if (pollRes.status === 'running') {
      // If it's technically still saving, just retry shortly (react-query handles retries)
    }
  }, [pollRes])

  // Process polling error
  useEffect(() => {
    if (pollError) {
      setShouldFetchFinal(false)
      setErrorMsg((pollError as any)?.response?.data?.detail || 'Something went wrong fetching the final plan.')
      setStatus('error')
    }
  }, [pollError])

  const handleSubmit = (compiledQuery: string) => {
    setLastQuery(compiledQuery)
    setPlan(null)
    setErrorMsg('')
    setSessionId('')
    setShouldFetchFinal(false)
    setStatus('loading')
    
    // Inject user settings if available
    let finalQuery = compiledQuery
    if (user?.settings) {
      const s = user.settings
      if (s.default_origin) {
        finalQuery += ` My origin city is ${s.default_origin}.`
      }
      if (s.dietary_preferences && s.dietary_preferences.length > 0) {
        finalQuery += ` Dietary preferences: ${s.dietary_preferences.join(', ')}.`
      }
    }
    
    startPlanMutation.mutate({ query: finalQuery, mode: appMode })
  }

  const isMissingInfoError = errorMsg.startsWith("Missing required information:")
  let missingFields: string[] = []
  if (isMissingInfoError) {
    const fieldsStr = errorMsg.replace("Missing required information: ", "").split(".")[0]
    missingFields = fieldsStr.split(", ").map(s => s.trim()).filter(Boolean)
  }

  const categories = [
    { id: 'budget', label: '💰 Budget' },
    { id: 'flights', label: '🚆 Transportation' },
    { id: 'hotels', label: '🏨 Hotels' },
    { id: 'visa', label: '🛂 Visa' },
    { id: 'itinerary', label: '📅 Itinerary' },
    { id: 'food', label: '🍜 Food' },
    { id: 'currency', label: '💱 Currency' },
    { id: 'weather', label: '🌤️ Weather' },
  ]

  return (
    <div className="h-screen overflow-hidden flex bg-[#0B1326] text-[#dbe2fd]">
      
      {/* Sidebar Overlay for Mobile/Sliding */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sliding Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-white/5 bg-[#060d20] h-full transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="text-2xl font-bold text-white tracking-tight">Menu</div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => { setCurrentView('planner'); setIsSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentView === 'planner' ? 'bg-[#131b2e] text-white border border-white/10 shadow-[0_0_15px_rgba(124,58,237,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            ✈️ Smart Journey
          </button>
          <button 
            onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentView === 'settings' ? 'bg-[#131b2e] text-white border border-white/10 shadow-[0_0_15px_rgba(124,58,237,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            ⚙️ Settings
          </button>
        </nav>
        
        <div className="p-6 mt-auto border-t border-white/5">
           <div className="flex items-center justify-between">
             <div className="text-sm truncate mr-2">
               <p className="text-white font-medium truncate">{user?.email || 'Guest'}</p>
               <p className="text-gray-500 text-xs truncate">Pro Traveler</p>
             </div>
             <button onClick={logout} className="p-2 text-gray-400 hover:text-[#ffb4ab] hover:bg-white/5 rounded-lg transition" title="Log out">
               <LogOut size={16} />
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden w-full">
        {/* TopBar */}
        <header className="border-b border-white/5 bg-[#0B1326]/80 backdrop-blur-md flex flex-col px-4 lg:px-8 py-3 sticky top-0 z-30 shrink-0 gap-3">
          {/* Row 1: Title and Logo */}
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
              >
                <Menu size={20} />
              </button>
              <div className="text-2xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#4cd7f6] bg-clip-text text-transparent pb-0.5">
                Smart Journey
              </div>
            </div>
            <img src="/bugendai_logo.png" alt="Logo" className="h-10 object-contain shrink-0 hidden sm:block drop-shadow-[0_0_10px_rgba(76,215,246,0.5)]" />
          </div>

          {/* Row 2: Breadcrumbs and Action Buttons */}
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-gray-400 font-medium capitalize hidden sm:block pl-2">
              Dashboard / <span className="text-white">{currentView === 'planner' ? 'Plan a Trip' : currentView === 'settings' ? 'Settings' : currentView.replace('category-', ' ') + ' Detail'}</span>
            </div>
            
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center bg-[#131b2e] p-1 rounded-lg border border-white/10 hidden sm:flex">
                <button 
                  onClick={() => setAppMode('demo')} 
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${appMode === 'demo' ? 'bg-[#7c3aed] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Demo
                </button>
                <button 
                  onClick={() => setAppMode('dev')} 
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${appMode === 'dev' ? 'bg-[#4cd7f6] text-[#060d20] shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Dev
                </button>
              </div>
              
              {currentView !== 'settings' && status !== 'idle' && (
                <button 
                  onClick={() => {
                    setStatus('idle')
                    setPlan(null)
                    setSessionId('')
                    setCurrentView('planner')
                  }}
                  className="text-xs font-semibold px-3 py-2 border border-white/10 hover:border-[#4cd7f6]/50 bg-white/5 hover:bg-white/10 rounded-xl transition text-[#4cd7f6]"
                >
                  🔄 Plan New Trip
                </button>
              )}

              {currentView !== 'settings' && status === 'done' && plan && (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="text-xs font-semibold px-3 py-2 border border-white/10 hover:border-[#4cd7f6]/50 bg-white/5 hover:bg-white/10 rounded-xl transition text-[#4cd7f6] flex items-center gap-1"
                    title="Explore detailed category views"
                  >
                    🧭 Explore Categories <ChevronDown size={14} />
                  </button>
                  
                  {isCategoryDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#0B1326] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setCurrentView(`category-${cat.id}`)
                            setIsCategoryDropdownOpen(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-white hover:bg-[#4cd7f6]/10 hover:text-[#4cd7f6] transition"
                        >
                          {cat.label}
                        </button>
                      ))}
                      <div className="border-t border-white/5 my-1"></div>
                      <button
                        onClick={() => {
                          setPackingModalOpen(true)
                          setIsCategoryDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition"
                      >
                        🎒 Packing List Pop-up
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentView !== 'settings' && status === 'done' && plan && (
                <>
                  {appMode === 'dev' && (
                    <button
                      onClick={() => setTerminalModalOpen(true)}
                      className="hidden sm:flex px-3 py-2 rounded-xl border border-white/10 text-[#4cd7f6] hover:text-white hover:border-[#4cd7f6]/50 bg-white/5 hover:bg-[#4cd7f6]/10 transition text-xs font-semibold items-center gap-2"
                      title="View AI Reasoning Logs"
                    >
                      🧠 View Logs
                    </button>
                  )}
                  <button
                    onClick={() => exportPlanToPdf(plan)}
                    className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-[#4cd7f6]/50 bg-white/5 hover:bg-white/10 transition"
                    title="Download PDF Plan"
                  >
                    <Download size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-[1440px] mx-auto">
            
            {currentView === 'settings' ? (
              <SettingsView />
            ) : currentView.startsWith('category-') && plan ? (
              <TripProvider plan={plan}>
                <CategoryView
                  category={currentView.replace('category-', '')}
                  onBack={() => setCurrentView('planner')}
                />
              </TripProvider>
            ) : (
              <>
                {/* Input Mode Selector & Generation Form (Only on Idle) */}
                {status === 'idle' && (
                  <div className="space-y-4 py-2">
                    <div className="text-center max-w-xl mx-auto space-y-2">
                      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#d2bbff] to-[#4cd7f6] bg-clip-text text-transparent tracking-tight">
                        Where is your next escape?
                      </h1>
                      <p className="text-[#ccc3d8] text-sm hidden sm:block">
                        Choose your preferred way to generate your plan. Let our AI multi-agent squad compile your trip.
                      </p>

                      <div className="flex justify-center gap-4 pt-1">
                        <button
                          type="button"
                          onClick={() => setInputMode('wizard')}
                          className={`px-5 py-2 rounded-xl font-bold text-xs border transition ${inputMode === 'wizard' ? 'border-[#4cd7f6] bg-[#4cd7f6]/10 text-white shadow-[0_0_15px_rgba(76,215,246,0.1)]' : 'border-white/5 bg-[#060d20]/50 text-gray-400 hover:text-white'}`}
                        >
                          🎯 Guided Questions
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMode('prompt')}
                          className={`px-5 py-2 rounded-xl font-bold text-xs border transition ${inputMode === 'prompt' ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-white shadow-[0_0_15px_rgba(124,58,237,0.1)]' : 'border-white/5 bg-[#060d20]/50 text-gray-400 hover:text-white'}`}
                        >
                          ✍️ Direct Text Prompt
                        </button>
                      </div>
                    </div>

                    {inputMode === 'wizard' ? (
                      <PlanWizard onSubmit={handleSubmit} />
                    ) : (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault()
                          const form = e.currentTarget
                          const textarea = form.elements.namedItem('query') as HTMLTextAreaElement
                          if (textarea && textarea.value.trim()) {
                            handleSubmit(textarea.value.trim())
                          }
                        }}
                        className="max-w-xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="text-xs text-white/50 bg-[#131b2e]/50 p-3 rounded-lg border border-white/5 mb-2">
                          ⚠️ <span className="font-semibold text-white/80">Required info:</span> Make sure to include your <b>Origin</b>, <b>Destination</b>, <b>Travel month/Dates</b>, <b>Budget</b>, and <b>Number of people</b> in your prompt!
                        </div>
                        <textarea
                          name="query"
                          required
                          maxLength={2000}
                          rows={4}
                          className="w-full bg-[#131b2e]/30 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#7c3aed]/50 placeholder-gray-500 text-sm transition-all shadow-inner"
                          placeholder="E.g. 'Plan a 5 day budget-friendly solo trip from Delhi to Tokyo, Japan in October. Budget is 1 lakh INR.'"
                        />
                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#7c3aed] to-[#4cd7f6] hover:opacity-90 rounded-xl text-white font-bold text-sm shadow-lg shadow-[#7c3aed]/20 transition-all"
                        >
                          Generate Custom Plan 🚀
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Results Area */}
                <div className="flex gap-6 items-start w-full">
                  <div className="flex-1 min-w-0 w-full">
                    {status === 'loading' && sessionId && (
                      <AgentReasoningTerminal 
                        sessionId={sessionId} 
                        aiModel={user?.settings?.ai_model || 'gemini-2.5-flash'}
                        appMode={appMode}
                        onComplete={() => setShouldFetchFinal(true)} 
                        onError={(msg) => {
                          setErrorMsg(msg)
                          setStatus('error')
                          setShouldFetchFinal(false)
                        }}
                      />
                    )}

                    {status === 'error' && isMissingInfoError && (
                      <div className="max-w-xl mx-auto card border-[#ffb4ab]/30 bg-[#93000a]/20 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xl mb-2 text-[#ffb4ab] font-bold">⚠️ Almost there!</h3>
                        <p className="text-sm text-[#ffdad6] mb-6">Your prompt was missing some required details. Please fill them in below to continue:</p>
                        <form onSubmit={(e) => {
                          e.preventDefault()
                          const formData = new FormData(e.currentTarget)
                          let extraInfo = ""
                          missingFields.forEach(f => {
                             extraInfo += ` ${f} is ${formData.get(f)}.`
                          })
                          handleSubmit(lastQuery + extraInfo)
                        }} className="space-y-4 text-left">
                          {missingFields.map(f => (
                            <div key={f}>
                              <label className="block text-xs font-semibold text-[#ffdad6]/80 mb-1">{f}</label>
                              <input required name={f} type="text" className="w-full bg-[#0B1326]/50 border border-[#ffb4ab]/20 rounded-lg p-2.5 text-white focus:border-[#ffb4ab]/60 focus:outline-none text-sm" placeholder={`Enter your ${f.toLowerCase()}...`} />
                            </div>
                          ))}
                          <div className="pt-4 flex gap-3">
                            <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-[#93000a] to-[#690005] hover:opacity-80 rounded-lg text-sm text-[#ffdad6] font-bold border border-[#ffb4ab]/30 transition">
                              Continue Planning ✨
                            </button>
                            <button type="button" onClick={() => setStatus('idle')} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-[#ffdad6]/70 hover:text-white transition">
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {status === 'error' && !isMissingInfoError && (
                      <div className="card border-[#ffb4ab]/30 bg-[#93000a]/20 text-center py-8">
                        <p className="text-xl mb-4 text-[#ffb4ab]">❌ {errorMsg}</p>
                        <button
                          onClick={() => setStatus('idle')}
                          className="px-6 py-2 bg-gradient-to-r from-[#93000a] to-[#690005] hover:opacity-80 rounded-lg text-sm text-[#ffdad6] font-medium border border-[#ffb4ab]/20 transition"
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    {status === 'done' && plan && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                        <TripProvider plan={plan}>
                          <ErrorBoundary fallbackName="PlanView">
                            <PlanView
                              onShowPackingList={() => setPackingModalOpen(true)}
                            />
                          </ErrorBoundary>
                        </TripProvider>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
          </div>
        </div>
      </main>

      {/* Modals */}
      {terminalModalOpen && sessionId && (
        <TerminalModal sessionId={sessionId} onClose={() => setTerminalModalOpen(false)} />
      )}

      {packingModalOpen && plan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1326] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#060d20]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🎒 Packing List</h2>
              <button onClick={() => setPackingModalOpen(false)} className="text-gray-400 hover:text-white transition bg-white/5 hover:bg-white/10 p-2 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <TripProvider plan={plan}>
                <PackingSection packingList={plan.packing_list} attractions={plan.tourist_attractions} />
              </TripProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
