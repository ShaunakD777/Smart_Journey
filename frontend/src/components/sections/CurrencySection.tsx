import type { CurrencyInfo } from '../../types'

interface Props { currency: CurrencyInfo }

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'AED',
  THB: '฿',
  IDR: 'Rp',
}

const getCurrencySymbol = (code: string) => {
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code
}

export default function CurrencySection({ currency }: Props) {
  const code = currency.dest_currency_code || 'JPY'
  const symbol = getCurrencySymbol(code)
  
  const rate = currency.inr_to_dest_rate || currency.inr_to_jpy_rate || 0
  const budgetInDest = currency.budget_in_dest_currency || currency.budget_in_jpy || 0
  const dailyBudgetDest = currency.daily_budget_dest_currency || currency.daily_budget_jpy || 0
  const usefulConversions = currency.useful_conversions || {}
  const paymentTips = currency.payment_tips || []

  if (rate <= 0 && budgetInDest <= 0 && dailyBudgetDest <= 0 && Object.keys(usefulConversions).length === 0 && paymentTips.length === 0) {
    return null
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-5">💱 Currency Info</h2>
      
      <div className="bg-[#172033] rounded-2xl p-5 mb-4 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-white/60 mb-1 uppercase tracking-wider">Exchange Rate</div>
          {rate > 0 && (
            <div className="text-lg font-bold text-white">
              1 INR = <span className="text-[#4cd7f6]">{rate.toFixed(3)} {code}</span>
            </div>
          )}
        </div>
        <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
          <div className="text-xs font-semibold text-white/60 mb-1 uppercase tracking-wider">Local Budget</div>
          {budgetInDest > 0 && (
            <div className="text-2xl font-black text-[#d2bbff]">
              {symbol}{budgetInDest.toLocaleString('en-US')}
            </div>
          )}
          {dailyBudgetDest > 0 && (
            <div className="text-xs text-white/70 mt-1">
              ≈ {symbol}{dailyBudgetDest.toLocaleString('en-US')} / day
            </div>
          )}
        </div>
      </div>

      {Object.keys(usefulConversions).length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-3">Quick Conversions</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(usefulConversions).map(([inr, destVal]) => (
              <div key={inr} className="bg-[#1c1635] border border-[#7c3aed]/20 rounded-xl p-3 flex justify-between items-center shadow-sm">
                <span className="font-semibold text-white">{inr}</span>
                <span className="text-white/40">→</span>
                <span className="font-bold text-[#d2bbff]">{destVal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {paymentTips.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Payment tips</p>
          {paymentTips.map((t, i) => (
            <p key={i} className="text-sm text-white/70 flex items-start gap-2 leading-relaxed">
              <span className="text-[#4cd7f6] mt-0.5">•</span> <span>{t}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
