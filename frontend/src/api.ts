import axios from 'axios'
import type { GetPlanResponse, PlanTripResponse } from './types'

// Reads from frontend/.env → VITE_API_URL=http://localhost:8000
// Falls back to localhost:8000 if not set.
const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'

// Centralized axios instance — all requests from the app should use this
// so the JWT Authorization header is automatically injected.
export const api = axios.create({ baseURL: `${BASE_URL}/api` })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export async function startPlan(params: { query: string; aiModel?: string; mode?: 'dev' | 'demo' }): Promise<PlanTripResponse> {
  try {
    let url = '/plan'
    if (params.aiModel) {
      url += `?ai_model=${encodeURIComponent(params.aiModel)}`
    }
    const { data } = await api.post<PlanTripResponse>(url, { query: params.query, mode: params.mode || 'demo' })
    return data
  } catch (error) {
    console.error("Error starting plan:", error)
    throw error
  }
}

export async function getPlan(sessionId: string): Promise<GetPlanResponse> {
  try {
    const { data } = await api.get<GetPlanResponse>(`/plan/${sessionId}`)
    return data
  } catch (error) {
    console.error("Error fetching plan:", error)
    throw error
  }
}

export async function getPlanLogs(sessionId: string) {
  try {
    const { data } = await api.get(`/plan/${sessionId}/logs`)
    return data
  } catch (error) {
    console.error("Error fetching logs:", error)
    throw error
  }
}

