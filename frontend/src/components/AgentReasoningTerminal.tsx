import { useEffect, useState, useRef } from 'react'
import { BrainCircuit, Wrench, Route, CheckCircle2, AlertTriangle } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import { BASE_URL } from '../api'

export interface AgentLog {
  type: 'thought' | 'tool' | 'tool_end' | 'routing' | 'done' | 'error'
  agent: string
  message: string
}

export default function AgentReasoningTerminal({
  sessionId,
  aiModel,
  appMode,
  initialLogs,
  onComplete,
  onError,
}: {
  sessionId?: string
  aiModel?: string
  appMode?: string
  initialLogs?: AgentLog[]
  onComplete?: () => void
  onError?: (msg: string) => void
}) {
  const [logs, setLogs] = useState<AgentLog[]>(() => {
    if (!initialLogs) return []
    // consolidate initial logs to prevent one word per line from DB storage
    const consolidated: AgentLog[] = []
    for (const log of initialLogs) {
      const last = consolidated[consolidated.length - 1]
      if (last && last.type === 'thought' && log.type === 'thought' && last.agent === log.agent) {
        last.message += log.message
      } else {
        consolidated.push({ ...log })
      }
    }
    return consolidated
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // If initialLogs are provided, this is a static view for a completed session.
    if (initialLogs) return
    
    if (!sessionId || !aiModel) return
    
    // Connect to real SSE stream
    const eventSource = new EventSource(`${BASE_URL}/api/plan/${sessionId}/stream?ai_model=${encodeURIComponent(aiModel)}&mode=${appMode || 'demo'}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AgentLog
        
        // Append chunk thoughts if consecutive, else new log
        setLogs((prev) => {
          const lastLog = prev[prev.length - 1]
          if (lastLog && lastLog.type === 'thought' && data.type === 'thought' && lastLog.agent === data.agent) {
             const newLogs = [...prev]
             newLogs[newLogs.length - 1] = { ...lastLog, message: lastLog.message + data.message }
             return newLogs
          }
          return [...prev, data]
        })
        
        if (data.type === 'done' || data.type === 'error') {
          eventSource.close()
          if (data.type === 'error' && onError) {
            onError(data.message)
          } else if (data.type === 'done' && onComplete) {
            setTimeout(onComplete, 1000) // Small delay to let user read the completion message
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err)
      }
    }
    
    eventSource.onerror = (err) => {
      console.error("EventSource failed", err)
      eventSource.close()
    }
    
    return () => {
      eventSource.close()
    }
  }, [sessionId, aiModel, initialLogs]) 

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const getAgentColor = (agent: string) => {
    if (agent === 'Supervisor') return 'text-[#ffb4ab]'
    if (agent === 'Logistics_Agent') return 'text-[#4cd7f6]'
    if (agent === 'Local_Expert_Agent') return 'text-[#7c3aed]'
    if (agent === 'Memory_Agent') return 'text-[#a7f3d0]'
    return 'text-gray-400'
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'thought': return <BrainCircuit size={16} className="mt-1 shrink-0" />
      case 'tool':
      case 'tool_end': return <Wrench size={16} className="mt-1 shrink-0" />
      case 'routing': return <Route size={16} className="mt-1 shrink-0" />
      case 'done': return <CheckCircle2 size={16} className="mt-1 shrink-0 text-green-400" />
      case 'error': return <AlertTriangle size={16} className="mt-1 shrink-0 text-red-500" />
      default: return <BrainCircuit size={16} className="mt-1 shrink-0" />
    }
  }

  if (appMode === 'demo') {
    let currentPhase = 1;
    let currentMessage = "Initializing planning session...";
    
    // Scan through all logs to find the highest phase reached, 
    // so we don't regress when the Supervisor/System steps in between agents.
    for (const log of logs) {
      if (log.agent === 'System') {
        if (currentPhase < 1) currentPhase = 1;
        if (currentPhase === 1) currentMessage = "Parsing your trip requirements...";
      }
      if (log.agent === 'Logistics_Agent') {
        if (currentPhase < 2) currentPhase = 2;
        if (currentPhase === 2) currentMessage = "Finding the best travel routes and checking currency exchange rates...";
      }
      if (log.agent === 'Local_Expert_Agent') {
        if (currentPhase < 3) currentPhase = 3;
        if (currentPhase === 3) currentMessage = "Finding the best hotels and local food spots...";
      }
      if (log.agent === 'Memory_Agent' || log.agent === 'Compiler_Agent') {
        currentPhase = 4;
        currentMessage = "Compiling your final itinerary...";
      }
    }

    return (
      <div className="w-full mt-8">
        <LoadingSpinner message={currentMessage} phase={currentPhase} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 border border-white/10 bg-[#060d20] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(124,58,237,0.15)] flex flex-col h-[500px]">
      <div className="bg-[#131b2e] px-4 py-2 border-b border-white/10 flex items-center gap-2 text-xs font-mono text-gray-400 shrink-0">
        <div className="flex gap-1.5 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        terminal@lumina-orbit: ~/agents/run
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {logs.length === 0 && (
          <div className="text-gray-500 flex items-center gap-3">
             <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
             Initializing multi-agent squad...
          </div>
        )}
        
        {logs.map((log, index) => (
          <div key={index} className="flex gap-4 text-gray-300 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`${getAgentColor(log.agent)} pt-0.5`}>
              {getIcon(log.type)}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`font-bold ${getAgentColor(log.agent)}`}>[{log.agent}]</span>
              <span className="ml-3 whitespace-pre-wrap leading-relaxed opacity-90 break-words">{log.message}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
