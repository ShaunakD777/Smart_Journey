import { createContext, useContext, ReactNode } from 'react'
import type { TripPlan } from '../types'

interface TripContextType {
  plan: TripPlan
}

const TripContext = createContext<TripContextType | undefined>(undefined)

export function TripProvider({ plan, children }: { plan: TripPlan; children: ReactNode }) {
  return (
    <TripContext.Provider value={{ plan }}>
      {children}
    </TripContext.Provider>
  )
}

export function useTrip() {
  const context = useContext(TripContext)
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider')
  }
  return context
}
