import { useEffect, useState } from 'react'

interface Props { 
  message: string 
  phase?: number
}

type AgentStatus = 'pending' | 'running' | 'completed'

interface AgentItem {
  name: string
  task: string
  icon: string
}

interface BatchGroup {
  id: number
  title: string
  description: string
  agents: AgentItem[]
}

const BATCHES: BatchGroup[] = [
  {
    id: 1,
    title: "Phase 1: Trip Parameters",
    description: "Parsing natural language query into structured trip parameters",
    agents: [
      { name: "System", icon: "🔍", task: "Extracting destination, dates, budget, and traveler count" }
    ]
  },
  {
    id: 2,
    title: "Phase 2: Core Logistics",
    description: "Analyzing flights, transportation routes, and fiat currency conversions",
    agents: [
      { name: "Logistics_Agent", icon: "✈️", task: "Searching best transport routes and calculating exchange rates" }
    ]
  },
  {
    id: 3,
    title: "Phase 3: Local Experience",
    description: "Curating hotels, food, and weather data for the destination",
    agents: [
      { name: "Local_Expert_Agent", icon: "🏨", task: "Matching traveler preferences to recommended lodging and meals" }
    ]
  },
  {
    id: 4,
    title: "Phase 4: Final Compilation",
    description: "Structuring the full itinerary and saving to memory",
    agents: [
      { name: "Memory_Agent", icon: "🧠", task: "Retrieving past user preferences and saving new trip memory" },
      { name: "Compiler_Agent", icon: "⚙️", task: "Assembling final JSON plan and validating constraints" }
    ]
  }
]

export default function LoadingSpinner({ message, phase = 1 }: Props) {
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  useEffect(() => {
    // Each phase represents a 25% chunk
    const targetBase = (phase - 1) * 25
    const targetMax = phase * 25

    if (simulatedProgress < targetBase) {
      setSimulatedProgress(targetBase)
    }

    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        // Slowly trickle upward but never cross the phase's max threshold until actual phase changes
        if (prev < targetMax - 2) {
          // Math.random() gives it a slightly natural "loading" feel instead of robotic ticking
          return prev + (Math.random() > 0.5 ? 1 : 0)
        }
        return prev
      })
    }, 800)

    return () => clearInterval(interval)
  }, [phase, simulatedProgress])

  const getBatchStatus = (batchId: number): AgentStatus => {
    if (batchId < phase) return 'completed'
    if (batchId === phase) return 'running'
    return 'pending'
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Central Progress Status */}
      <div className="card bg-gradient-to-br from-gray-900 to-slate-900 border-gray-800 text-center mb-8 p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-700 ease-out" style={{ width: `${simulatedProgress}%` }} />
        
        <div className="flex flex-col items-center">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin absolute" />
            <div className="text-3xl animate-bounce">✈️</div>
          </div>
          <h3 className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Assembling Your Custom Trip Plan
          </h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">{message}</p>
          <div className="mt-4 text-xs font-semibold text-blue-400 tracking-wider uppercase tabular-nums">
            Progress: {simulatedProgress}%
          </div>
        </div>
      </div>

      {/* Batch checklist details */}
      <div className="space-y-6">
        {BATCHES.map((batch) => {
          const batchStatus = getBatchStatus(batch.id)
          
          return (
            <div 
              key={batch.id} 
              className={`card transition-all duration-500 border ${
                batchStatus === 'running' 
                  ? 'border-blue-500/40 bg-blue-950/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : batchStatus === 'completed'
                  ? 'border-green-900/40 opacity-70'
                  : 'border-gray-800 opacity-40'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className={`text-md font-bold ${
                    batchStatus === 'running' 
                      ? 'text-blue-400' 
                      : batchStatus === 'completed'
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}>
                    {batch.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{batch.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {batchStatus === 'running' && (
                    <span className="badge bg-blue-900/50 text-blue-300 text-xs animate-pulse">Running</span>
                  )}
                  {batchStatus === 'completed' && (
                    <span className="badge bg-green-900/50 text-green-300 text-xs">✓ Done</span>
                  )}
                  {batchStatus === 'pending' && (
                    <span className="badge bg-gray-800 text-gray-500 text-xs">Pending</span>
                  )}
                </div>
              </div>

              {/* Sub-agents in this batch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 border-l border-gray-800/80">
                {batch.agents.map((agent) => {
                  return (
                    <div 
                      key={agent.name} 
                      className={`flex items-start gap-3 p-2 rounded-lg ${
                        batchStatus === 'running' ? 'bg-gray-900/50' : ''
                      }`}
                    >
                      <span className="text-xl mt-0.5">{agent.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-300">{agent.name}</p>
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{agent.task}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
