import { useEffect, useState } from 'react'
import { getPlanLogs } from '../api'
import AgentReasoningTerminal, { AgentLog } from './AgentReasoningTerminal'
import { X } from 'lucide-react'

interface TerminalModalProps {
  sessionId: string
  onClose: () => void
}

export default function TerminalModal({ sessionId, onClose }: TerminalModalProps) {
  const [logs, setLogs] = useState<AgentLog[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        const response = await getPlanLogs(sessionId)
        if (response && response.logs) {
          setLogs(response.logs)
        } else {
          setLogs([])
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch logs")
      } finally {
        setLoading(false)
      }
    }
    
    fetchLogs()
  }, [sessionId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-[#060d20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-[#0B1326]/80">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🧠 Agent Reasoning Logs
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 bg-gradient-to-br from-[#131b2e] to-[#060d20]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-8 h-8 border-2 border-[#4cd7f6] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Fetching historical logs...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 py-10 text-center bg-red-400/10 rounded-xl border border-red-400/20">
              ⚠️ {error}
            </div>
          ) : logs && logs.length > 0 ? (
            <AgentReasoningTerminal initialLogs={logs} />
          ) : (
            <div className="text-gray-400 py-10 text-center bg-white/5 rounded-xl border border-white/10">
              No historical logs found for this session.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
