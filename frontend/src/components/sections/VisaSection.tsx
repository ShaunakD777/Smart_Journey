import type { VisaInfo } from '../../types'
import { ExternalLink } from 'lucide-react'

interface Props { visa: VisaInfo }

export default function VisaSection({ visa }: Props) {
  const steps = visa.application_steps || []
  const docs = visa.required_documents || []

  if (!visa.visa_required && steps.length === 0 && docs.length === 0 && !visa.embassy_link) {
    return null
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">🛂 Visa Information</h2>
        {visa.embassy_link && (
          <a href={visa.embassy_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-semibold text-[#4cd7f6] hover:text-white transition">
            <ExternalLink size={14} /> Official site
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className={`badge border ${visa.visa_required ? 'bg-[#1c1635] text-[#d2bbff] border-[#7c3aed]/30' : 'bg-[#172033] text-green-400 border-green-500/20'}`}>
          {visa.visa_required ? '⚠️ Visa required' : '✅ Visa not required'}
        </span>
        {visa.visa_type && (
          <span className="badge bg-[#172033] text-white/90 border border-white/10">{visa.visa_type}</span>
        )}
        {visa.processing_time && (
          <span className="badge bg-[#172033] text-white/90 border border-white/10">⏱ {visa.processing_time}</span>
        )}
        {visa.estimated_fee_inr > 0 && (
          <span className="badge bg-[#172033] text-white/90 border border-white/10">₹{visa.estimated_fee_inr.toLocaleString('en-IN')} fee</span>
        )}
      </div>

      {steps.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-3">Application steps</p>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="bg-[#172033] rounded-2xl p-4 border border-white/5 flex gap-4 items-start shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#202b40] flex items-center justify-center text-sm font-bold text-[#4cd7f6] shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 mt-1 text-sm text-white/80 leading-relaxed">
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Required documents</p>
          {docs.map((d, i) => (
            <p key={i} className="text-sm text-white/70 flex items-start gap-2 leading-relaxed">
              <span className="text-[#4cd7f6] mt-0.5">•</span> <span>{d}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
